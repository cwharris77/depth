// Generates the prerendered uniform thumbnails for the native iOS picker (DEP-220) from
// the exact committed rows that picker renders. data.ts is the complete curated archive the
// migration seeds, so raster output is independent of local credentials or hosted data.
//
// Outputs: `public/uniforms/<id>.webp` per row (id = `<teamId>-<slug>-<yearStart>`),
// deterministically rendered from the shared UniformFigure jersey crop (the same SVG the
// web picker's JerseySwatch fallback renders) and rasterized with sharp. Committed to the
// repo like the `gen:icons` rasters and served under /uniforms/ (origin-relative on web,
// per DEP-406); the DB's `uniforms.image_path` column points each row at its artifact
// (see the backfill migration and lib/uniforms/seed-sql.ts).
//
// Usage: npm run gen:uniform-thumbs
// Pure rendering lives in lib/uniforms/art.tsx — this script is I/O glue.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderUniformThumbSVG } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import { findUnresolvedConstructions } from '@/lib/uniforms/teams/validate';
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
  constructionKey: string;
  colors: JerseyColors;
};

// The complete committed catalog, using the same deterministic ids as the seed migration.
export function buildRowsFromCatalog(): UniformRow[] {
  return UNIFORMS.map((uniform) => ({
    id: `${uniform.teamId}-${uniform.slug}-${uniform.yearStart}`,
    teamId: uniform.teamId,
    constructionKey: uniform.constructionKey,
    colors: uniform.colors,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

async function writeRows(rows: UniformRow[]) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const row of rows) {
    for (const { suffix, variant } of Object.values(VARIANTS)) {
      const svg = renderUniformThumbSVG(
        row.colors,
        row.id,
        getTeamUniformDefinition(row.teamId),
        variant,
        row.constructionKey
      );
      const outPath = join(OUT_DIR, `${row.id}${suffix}.webp`);
      await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(outPath);
      console.log(`wrote ${outPath}`);
    }
  }
  console.log(`\n${rows.length} uniform rasters (jersey + full) -> ${OUT_DIR}`);
}

async function main() {
  // Refuse to rasterize from an unpinned toolchain: sharp's version is part of the
  // determinism contract in the design spec's "committed inputs only" rule.
  await assertRasterToolchain();
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
  await writeRows(rows);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
