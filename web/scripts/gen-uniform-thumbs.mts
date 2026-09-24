// Generates the prerendered uniform thumbnails for the native iOS picker from
// the exact committed rows that picker renders. data.ts is the complete curated archive the
// migration seeds, so raster output is independent of local credentials or hosted data.
//
// Outputs: `public/uniforms/<id>.webp` per row (id = `<teamId>-<slug>-<yearStart>`),
// deterministically rendered from the shared UniformFigure jersey crop (the same SVG the web
// picker's JerseySwatch fallback renders) and rasterized with sharp. Committed to the repo like the
// `gen:icons` rasters and served under /uniforms/ (origin-relative on web); the DB's
// `uniforms.image_path` column points each row at its artifact (see the backfill migration and
// lib/uniforms/seed-sql.ts).
//
// Also emits `public/uniforms/manifest.json`: per catalog row, its
// construction key, each WebP's SHA-256, the SHA-256 build digest of the committed inputs,
// and a content-addressed delivery revision. The manifest is committed next to the rasters,
// so `manifest.test.ts` can fail a changed raster with a stale manifest. Publication order:
// the corrected WebP + manifest must be live before any catalog row references the
// construction (see lib/uniforms/manifest.ts's header for the full contract).
//
// Usage: npm run gen:uniform-thumbs
// Pure rendering lives in lib/uniforms/art.tsx — this script is I/O glue.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderUniformThumbSVG } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import {
  ARTIFACT_MANIFEST_RELATIVE_PATH,
  artifactPath,
  buildArtifactManifest,
  computeSourceDigest,
  serializeArtifactManifest,
  sha256Hex,
  type ArtifactRecord,
  type CombinationArtifact,
  type ManifestRowInput,
} from '@/lib/uniforms/manifest';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import { getAllTeamCatalogs, getTeamCatalog } from '@/lib/uniforms/teams/catalogs';
import {
  combinationArtifactName,
  combinationKitKey,
  extraCombinations,
  validateCatalog,
  type TeamCatalog,
} from '@/lib/uniforms/teams/core/catalog';
import { findUnresolvedConstructions } from '@/lib/uniforms/teams/core/validate';
import type { JerseyColors } from '@/lib/types';
import { assertRasterToolchain } from './uniform-draw/toolchain-preflight.mts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'uniforms');
// The two raster variants each kit is committed as: the jersey crop the picker rows use,
// and the full mannequin (helmet -> cleats) the uniform archive uses. The archive's
// figure is `variant="full"`, so pointing it at the square jersey crop stretches it —
// the -full raster is the fix for that (see components/UniformArchive.tsx).
const VARIANTS = {
  jersey: { suffix: '', variant: 'jersey' as const },
  full: { suffix: '-full', variant: 'full' as const },
} as const;

type UniformRow = {
  id: string;
  teamId: string;
  slug: string;
  constructionKey: string;
  colors: JerseyColors;
};

// The complete committed catalog, using the same deterministic ids as the seed migration.
export function buildRowsFromCatalog(): UniformRow[] {
  return UNIFORMS.map((uniform) => ({
    id: `${uniform.teamId}-${uniform.slug}-${uniform.yearStart}`,
    teamId: uniform.teamId,
    slug: uniform.slug,
    constructionKey: uniform.constructionKey,
    colors: uniform.colors,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

export interface CombinationRender {
  rowId: string;
  key: string;
  label: string;
  constructionKey: string;
  fileName: string;
}

// Extra verified combinations of each catalogued row, rendered as full figures only.
export function combinationRenders(
  rows: ReadonlyArray<Pick<UniformRow, 'id' | 'teamId' | 'slug'>>,
  catalogFor: (teamId: string) => TeamCatalog | undefined
): CombinationRender[] {
  return rows.flatMap((row) => {
    const design = catalogFor(row.teamId)?.designs.find((entry) => entry.slug === row.slug);
    if (!design) return [];
    return extraCombinations(design).map((combination) => ({
      rowId: row.id,
      key: combination.key,
      label: combination.label,
      constructionKey: combinationKitKey(design, combination),
      fileName: combinationArtifactName(row.id, combination.key),
    }));
  });
}

// Renders and commits each raster, returning the hashed inputs the manifest needs. The WebP
// bytes are hashed before they hit disk; reading back the written file would make the digest
// depend on the filesystem rather than on what sharp produced.
async function writeRasters(rows: UniformRow[]): Promise<ManifestRowInput[]> {
  mkdirSync(OUT_DIR, { recursive: true });
  const combinations = combinationRenders(rows, getTeamCatalog);
  const inputs: ManifestRowInput[] = [];
  for (const row of rows) {
    const artifacts = {} as Record<keyof typeof VARIANTS, ArtifactRecord>;
    for (const key of Object.keys(VARIANTS) as Array<keyof typeof VARIANTS>) {
      const { suffix, variant } = VARIANTS[key];
      const svg = renderUniformThumbSVG(
        row.colors,
        row.id,
        getTeamUniformDefinition(row.teamId),
        variant,
        row.constructionKey
      );
      const fileName = `${row.id}${suffix}.webp`;
      const outPath = join(OUT_DIR, fileName);
      const raster = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
      writeFileSync(outPath, raster);
      artifacts[key] = {
        path: artifactPath(fileName),
        sha256: sha256Hex(raster),
      };
      console.log(`wrote ${outPath}`);
    }
    const rowCombinations: CombinationArtifact[] = [];
    for (const combination of combinations.filter((c) => c.rowId === row.id)) {
      const svg = renderUniformThumbSVG(
        row.colors,
        row.id,
        getTeamUniformDefinition(row.teamId),
        'full',
        combination.constructionKey
      );
      const outPath = join(OUT_DIR, combination.fileName);
      const raster = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
      writeFileSync(outPath, raster);
      rowCombinations.push({
        key: combination.key,
        label: combination.label,
        full: { path: artifactPath(combination.fileName), sha256: sha256Hex(raster) },
      });
      console.log(`wrote ${outPath}`);
    }
    inputs.push({
      catalogId: row.id,
      constructionKey: row.constructionKey,
      jersey: artifacts.jersey,
      full: artifacts.full,
      ...(rowCombinations.length ? { combinations: rowCombinations } : {}),
    });
  }
  return inputs;
}

async function main() {
  // Refuse to rasterize from an unpinned toolchain: sharp's version determines the bytes.
  await assertRasterToolchain();
  const catalogIssues = getAllTeamCatalogs().flatMap(({ catalog, parts }) =>
    validateCatalog(catalog, parts)
  );
  if (catalogIssues.length > 0) {
    throw new Error(
      `invalid team catalog:\n${catalogIssues.map((issue) => `  - ${issue}`).join('\n')}`
    );
  }
  const rows = buildRowsFromCatalog();
  // A row whose construction key is not a registered kit renders the generic fallback — fine
  // in the running app, never acceptable for a published raster. Fail the whole run instead of
  // committing art that silently degrades to the mannequin default.
  const unresolved = findUnresolvedConstructions(
    rows,
    (teamId) => getTeamUniformDefinition(teamId)?.kits
  );
  if (unresolved.length > 0) {
    throw new Error(
      'curated rows resolve to no registered construction:\n' +
        unresolved
          .map((row) => `  - ${row.id}: no kit "${row.constructionKey}" for ${row.teamId}`)
          .join('\n')
    );
  }
  const artifactInputs = await writeRasters(rows);
  const manifest = buildArtifactManifest(computeSourceDigest(ROOT), artifactInputs);
  const manifestPath = join(ROOT, ARTIFACT_MANIFEST_RELATIVE_PATH);
  writeFileSync(manifestPath, serializeArtifactManifest(manifest));
  console.log(`wrote ${manifestPath}`);
  console.log(`\n${rows.length} uniform rasters (jersey + full) -> ${OUT_DIR}`);
  console.log(
    `artifact revision ${manifest.revision} (source ${manifest.sourceDigest.slice(0, 12)})`
  );
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
