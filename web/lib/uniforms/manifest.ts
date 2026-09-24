// Committed artifact manifest and delivery revision for the uniform raster pipeline.
//
// Committed WebPs are only part of the publication path: this module records, per catalog
// row, the construction it renders as,
// the SHA-256 of each committed WebP, and a content-addressed revision; and, for the set, the
// build digest of the committed inputs that produced them.
//
// Build digest — `sourceDigest` is one SHA-256 over the committed inputs that determine the
// rendered bytes, in a fixed order (path, NUL, bytes, NUL):
//   - the catalog snapshot (`lib/uniforms/data.ts`);
//   - the accepted authoring data (every non-test `.ts` under `lib/uniforms/teams/`);
//   - the renderer (`art.tsx`, `model.ts`, the numeral/helmet path modules, the shared
//     `UniformFigure`, and the color resolver it reads);
//   - the raster toolchain pin (`package-lock.json`, i.e. the exact `sharp`).
// There is no font input: the renderer draws vector numerals/marks, never an installed
// font, so a font cannot change the bytes. A sourceDigest change with no artifact change is
// still a manifest regen, which is the point — the digest names the build, not just the art.
//
// Delivery revision — `rows[].revision` is a short content hash of a row's two artifact
// hashes (plus its catalog id). Clients that cached an old `/uniforms/<id>.webp` request the
// same origin-relative path with `?rev=<rows[].revision>` appended (art.tsx's
// `uniformArtURL(id, revision)` composes exactly that); when corrected bytes are published the
// hash — and therefore the URL — changes, so the stale cache entry is missed. The top-level
// `revision` is the published-set identity: it changes whenever `sourceDigest` or any row
// artifact changes. The manifest itself is served origin-relative at `/uniforms/manifest.json`.
//
// Rows may also list extra verified combinations, each a full-figure artifact at
// `<rowId>--<key>-full.webp`. They are omitted when a row has none, and they do not feed the
// row revision, since each carries its own hash.
//
// Publication ordering rule — corrected assets must be published BEFORE any catalog row
// references them. The sequence is: (1) generate the corrected WebPs and regenerate this
// manifest in the same commit; (2) deploy so the new bytes and the new manifest are live at
// their origin-relative paths; (3) only then let a catalog row (a `lib/uniforms/data.ts`
// edit, and the append-only seed it produces) point at that construction. Reversing 2 and 3
// serves a row whose raster is either missing or the pre-correction bytes, and the revision
// query is what makes clients holding the old bytes re-fetch instead of trusting their cache.
//
// This module is Node-only (it reads the committed inputs and hashes bytes). Never import it
// from a client component or the runtime renderer; the runtime keeps using art.tsx's URL
// helpers, and the revision rides as a query parameter on top of them.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// web/ — this file is `web/lib/uniforms/manifest.ts`, so two levels up is the app root.
export const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The committed manifest, app-root-relative (what `gen-uniform-thumbs.mts` writes) and its
// origin-relative public URL (what a client reads).
export const ARTIFACT_MANIFEST_RELATIVE_PATH = join('public', 'uniforms', 'manifest.json');
export const ARTIFACT_MANIFEST_PUBLIC_PATH = '/uniforms/manifest.json';

// Bump only on an incompatible shape change, so an old manifest is rejected rather than
// silently misread.
export const MANIFEST_VERSION = 1;

// The origin-relative directory every committed raster lives under (relative, so
// local dev and Vercel previews serve the same bytes as production).
export const UNIFORM_ARTIFACT_DIR = '/uniforms/';

export function artifactPath(fileName: string): string {
  return `${UNIFORM_ARTIFACT_DIR}${fileName}`;
}

export interface ArtifactRecord {
  // Origin-relative (`/uniforms/<file>.webp`), never absolute.
  path: string;
  // Lowercase hex SHA-256 of the committed WebP bytes.
  sha256: string;
}

// An extra verified combination of a row's design. It shares the row's jersey crop, so only
// its full figure is an artifact.
export interface CombinationArtifact {
  key: string;
  label: string;
  full: ArtifactRecord;
}

export interface ArtifactManifestRow {
  catalogId: string;
  constructionKey: string;
  // Cache-busting identity for this row's two artifacts (`?rev=` in the delivery URL).
  revision: string;
  artifacts: {
    jersey: ArtifactRecord;
    full: ArtifactRecord;
  };
  combinations?: CombinationArtifact[];
}

export interface ArtifactManifest {
  version: number;
  // SHA-256 over the committed inputs that determine the rendered bytes (see header).
  sourceDigest: string;
  // Published-set identity; changes when the source digest or any artifact changes.
  revision: string;
  rows: ArtifactManifestRow[];
}

// The generator's per-row input before the derived revision/set identity are computed.
export interface ManifestRowInput {
  catalogId: string;
  constructionKey: string;
  jersey: ArtifactRecord;
  full: ArtifactRecord;
  combinations?: CombinationArtifact[];
}

// Committed inputs whose bytes can change a rendered artifact, all app-root-relative. The
// authoring modules under `lib/uniforms/teams/` are added by directory walk so a new team
// module is hashed without editing this list; tests and the generator-only `validate.ts` are
// excluded because neither changes rendered bytes.
const RENDER_INPUTS = [
  'lib/uniforms/data.ts', // catalog snapshot
  'lib/uniforms/art.tsx', // pure raster SVG generation
  'lib/uniforms/model.ts', // model resolution
  'lib/uniforms/jersey-art.ts', // canonical numeral glyph paths
  'lib/uniforms/helmet-art.ts', // helmet mark path data
  'lib/uniforms/helmet-shading.ts', // helmet shading
  'lib/uniforms/figure.ts', // viewBox / variant spec
  'lib/utils/colors.ts', // number-fill contrast resolver
  'components/UniformFigure.tsx', // shared renderer
  'package-lock.json', // raster toolchain pin (sharp)
] as const;

function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/');
}

function walkFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
}

// Every non-test authoring module under `lib/uniforms/teams/`. `validate.ts` is pipeline
// control flow, not an input to the drawn bytes, so it is excluded.
function authoringInputs(webRoot: string): string[] {
  const files: string[] = [];
  walkFiles(join(webRoot, 'lib', 'uniforms', 'teams'), files);
  return files
    .map((file) => toPosix(relative(webRoot, file)))
    .filter(
      (rel) => rel.endsWith('.ts') && !rel.endsWith('.test.ts') && !rel.endsWith('validate.ts')
    );
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

// Deterministic SHA-256 over the committed render inputs, in sorted-path order. Throws when a
// named input is missing: a missing renderer input means the digest would silently stop
// tracking a real dependency, which is worse than failing the build.
export function computeSourceDigest(webRoot: string = WEB_ROOT): string {
  const inputs = [...new Set<string>([...RENDER_INPUTS, ...authoringInputs(webRoot)])].sort();
  const hash = createHash('sha256');
  for (const rel of inputs) {
    const bytes = readFileSync(join(webRoot, ...rel.split('/')));
    hash.update(rel, 'utf8');
    hash.update('\0');
    hash.update(bytes);
    hash.update('\0');
  }
  return hash.digest('hex');
}

// A row's cache-busting identity: content-addressed over its two committed artifacts, so a
// rebuild that produces identical bytes keeps the URL stable and only a changed raster (or a
// changed row id) moves it.
export function artifactRevision(
  catalogId: string,
  jerseySha256: string,
  fullSha256: string
): string {
  return sha256Hex(`${catalogId}\n${jerseySha256}\n${fullSha256}`).slice(0, 16);
}

// Builds the manifest from already-computed inputs. Deterministic: rows are sorted by
// catalog id, so the same committed rasters always serialize identically.
export function buildArtifactManifest(
  sourceDigest: string,
  rows: ReadonlyArray<ManifestRowInput>
): ArtifactManifest {
  const manifestRows = [...rows]
    .sort((left, right) => left.catalogId.localeCompare(right.catalogId))
    .map((row): ArtifactManifestRow => ({
      catalogId: row.catalogId,
      constructionKey: row.constructionKey,
      revision: artifactRevision(row.catalogId, row.jersey.sha256, row.full.sha256),
      artifacts: {
        jersey: { ...row.jersey },
        full: { ...row.full },
      },
      ...(row.combinations?.length
        ? {
            combinations: row.combinations.map((c) => ({
              key: c.key,
              label: c.label,
              full: { ...c.full },
            })),
          }
        : {}),
    }));
  const revision = sha256Hex(
    [sourceDigest, ...manifestRows.map((row) => `${row.catalogId}:${row.revision}`)].join('\n')
  ).slice(0, 16);
  return { version: MANIFEST_VERSION, sourceDigest, revision, rows: manifestRows };
}

// The exact bytes written to `public/uniforms/manifest.json` — two-space JSON plus a trailing
// newline, so a committed manifest is Prettier-stable and diffable.
export function serializeArtifactManifest(manifest: ArtifactManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

// Every difference between the manifest the repo committed (`expected`) and one recomputed
// from the committed inputs (`actual`), as readable lines. An empty array means the manifest
// and the artifacts on disk agree.
export function diffArtifactManifest(
  expected: ArtifactManifest,
  actual: ArtifactManifest
): string[] {
  const diffs: string[] = [];
  if (expected.version !== actual.version) {
    diffs.push(`version: manifest ${expected.version}, rasters ${actual.version}`);
  }
  if (expected.sourceDigest !== actual.sourceDigest) {
    diffs.push(
      `sourceDigest: manifest ${expected.sourceDigest}, recomputed ${actual.sourceDigest} (regenerate the manifest)`
    );
  }
  if (expected.revision !== actual.revision) {
    diffs.push(`revision: manifest ${expected.revision}, recomputed ${actual.revision}`);
  }
  const expectedById = new Map(expected.rows.map((row) => [row.catalogId, row]));
  const actualById = new Map(actual.rows.map((row) => [row.catalogId, row]));
  for (const id of expectedById.keys()) {
    if (!actualById.has(id)) diffs.push(`${id}: manifest row has no committed rasters`);
  }
  for (const id of actualById.keys()) {
    if (!expectedById.has(id)) diffs.push(`${id}: committed rasters have no manifest row`);
  }
  for (const [id, expectedRow] of expectedById) {
    const actualRow = actualById.get(id);
    if (!actualRow) continue;
    if (expectedRow.constructionKey !== actualRow.constructionKey) {
      diffs.push(
        `${id}: constructionKey ${expectedRow.constructionKey} != ${actualRow.constructionKey}`
      );
    }
    for (const variant of ['jersey', 'full'] as const) {
      const expectedArtifact = expectedRow.artifacts[variant];
      const actualArtifact = actualRow.artifacts[variant];
      if (expectedArtifact.path !== actualArtifact.path) {
        diffs.push(`${id}: ${variant} path ${expectedArtifact.path} != ${actualArtifact.path}`);
      }
      if (expectedArtifact.sha256 !== actualArtifact.sha256) {
        diffs.push(`${id}: ${variant} sha256 changed (manifest is stale)`);
      }
    }
    const expectedCombosByKey = new Map(
      (expectedRow.combinations ?? []).map((combination) => [combination.key, combination])
    );
    const actualCombosByKey = new Map(
      (actualRow.combinations ?? []).map((combination) => [combination.key, combination])
    );
    for (const key of expectedCombosByKey.keys()) {
      if (!actualCombosByKey.has(key)) {
        diffs.push(`${id}: combination ${key} has no committed raster`);
      }
    }
    for (const key of actualCombosByKey.keys()) {
      if (!expectedCombosByKey.has(key)) {
        diffs.push(`${id}: combination ${key} has no manifest entry`);
      }
    }
    for (const [key, expectedCombination] of expectedCombosByKey) {
      const actualCombination = actualCombosByKey.get(key);
      if (!actualCombination) continue;
      if (expectedCombination.label !== actualCombination.label) {
        diffs.push(
          `${id}: combination ${key} label ${expectedCombination.label} != ${actualCombination.label}`
        );
      }
      if (expectedCombination.full.path !== actualCombination.full.path) {
        diffs.push(
          `${id}: combination ${key} path ${expectedCombination.full.path} != ${actualCombination.full.path}`
        );
      }
      if (expectedCombination.full.sha256 !== actualCombination.full.sha256) {
        diffs.push(`${id}: combination ${key} sha256 changed (manifest is stale)`);
      }
    }
  }
  return diffs;
}
