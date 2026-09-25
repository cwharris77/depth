// Builds a private, uncommitted per-team review sheet: every catalog design's before/after
// rasters, its extra combinations, and (when a refs directory is given) the team's reference
// images and review.json annotations. Nothing this script reads or writes is ever committed.
//
// Usage: npm run review:uniforms -- --team <teamId> [--base origin/main] [--refs <dir>] [--out <file.html>]
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path, { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderUniformThumbSVG } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import { getTeam } from '@/lib/teams';
import {
  buildReviewSheet,
  parseReviewNotes,
  type ImageRef,
  type ReviewDesign,
  type ReviewNotes,
} from '@/lib/uniforms/review-sheet';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import { getTeamCatalog } from '@/lib/uniforms/teams/catalogs';
import { NEEDS_SOURCE, designRowId } from '@/lib/uniforms/teams/core/catalog';
import type { JerseyColors } from '@/lib/types';
import { combinationRenders } from './gen-uniform-thumbs.mts';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(SCRIPT_DIR, '..');
const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;

interface Args {
  team: string;
  base: string;
  refs?: string;
  out?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { base: 'origin/main' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--team') args.team = argv[++i];
    else if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--refs') args.refs = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  if (!args.team) {
    throw new Error(
      'Usage: npm run review:uniforms -- --team <teamId> [--base origin/main] [--refs <dir>] [--out <file.html>]'
    );
  }
  return { team: args.team, base: args.base ?? 'origin/main', refs: args.refs, out: args.out };
}

function repoRoot(): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: WEB_ROOT,
    encoding: 'utf8',
  }).trim();
}

// Resolved once, so a typo'd --base fails clearly here instead of readBefore silently treating
// every row as "before missing".
function resolveBaseCommit(root: string, base: string): string {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', '--verify', `${base}^{commit}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error(`--base "${base}" does not resolve to a commit`);
  }
}

// The nearest ancestor directory that already exists, so a not-yet-created --out directory can
// still be checked against the git worktree it would land in before anything is created.
function nearestExistingAncestor(dir: string): string {
  let at = dir;
  while (!existsSync(at)) {
    const parent = dirname(at);
    if (parent === at) return at;
    at = parent;
  }
  return at;
}

function isInsideGitWorktree(dir: string): boolean {
  try {
    execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

// The sheet and every reference image are private and never committed, so --out is refused
// whenever it would land inside any git work tree, not just this repo's.
function resolveOutPath(outArg: string | undefined, team: string): string {
  const outPath = outArg ?? join(os.tmpdir(), `uniform-review-${team}.html`);
  const resolved = path.resolve(outPath);
  const dir = dirname(resolved);
  const realAncestor = realpathSync(nearestExistingAncestor(dir));
  if (isInsideGitWorktree(realAncestor)) {
    throw new Error(`refusing to write the review sheet inside a git work tree: ${resolved}`);
  }
  mkdirSync(dir, { recursive: true });
  return resolved;
}

function toDataUri(buffer: Buffer, mime = 'image/webp'): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

// One render-and-encode step for both a row's canonical "after" raster and every extra
// combination raster -- both are the same full-figure render, only the construction key differs.
async function renderKitWebp(
  row: { id: string; teamId: string; colors: JerseyColors },
  constructionKey: string
): Promise<Buffer> {
  const svg = renderUniformThumbSVG(
    row.colors,
    row.id,
    getTeamUniformDefinition(row.teamId),
    'full',
    constructionKey
  );
  return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
}

async function renderAfter(row: {
  id: string;
  teamId: string;
  slug: string;
  constructionKey: string;
  colors: (typeof UNIFORMS)[number]['colors'];
}): Promise<ImageRef> {
  const raster = await renderKitWebp(row, row.constructionKey);
  return { src: toDataUri(raster), alt: `${row.id} after` };
}

function readBefore(root: string, baseCommit: string, rowId: string): Buffer | undefined {
  try {
    return execFileSync(
      'git',
      ['-C', root, 'show', `${baseCommit}:web/public/uniforms/${rowId}-full.webp`],
      { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] }
    );
  } catch {
    return undefined;
  }
}

const IMAGE_EXTENSIONS = new Set(['.png', '.gif', '.jpg', '.jpeg', '.webp']);

async function loadReferences(
  refsDir: string,
  teamId: string,
  crops: ReviewNotes['crops']
): Promise<{ references: ImageRef[]; croppedByRowId: Map<string, ImageRef> }> {
  const teamDir = join(refsDir, teamId);
  const references: ImageRef[] = [];
  const croppedByRowId = new Map<string, ImageRef>();
  if (!existsSync(teamDir)) return { references, croppedByRowId };

  const files = readdirSync(teamDir)
    .filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()))
    .sort();

  for (const file of files) {
    const filePath = join(teamDir, file);
    const raster = await sharp(filePath, { animated: false })
      .resize({ width: 1600, withoutEnlargement: true })
      .webp()
      .toBuffer();
    references.push({ src: toDataUri(raster), alt: file });
  }

  for (const [rowId, crop] of Object.entries(crops)) {
    const cropPath = join(teamDir, crop.file);
    if (!existsSync(cropPath)) {
      console.warn(`review.json: crop file missing for "${rowId}": ${crop.file}`);
      continue;
    }
    const [left, top, width, height] = crop.box;
    const raster = await sharp(cropPath, { animated: false })
      .extract({ left, top, width, height })
      .webp()
      .toBuffer();
    croppedByRowId.set(rowId, { src: toDataUri(raster), alt: `${rowId} reference crop` });
  }

  return { references, croppedByRowId };
}

function loadReviewNotes(refsDir: string | undefined, teamId: string): ReviewNotes {
  const empty: ReviewNotes = { crops: {}, missing: [], absentMarks: [] };
  if (!refsDir) return empty;
  const notesPath = join(refsDir, teamId, 'review.json');
  if (!existsSync(notesPath)) return empty;
  const json = JSON.parse(readFileSync(notesPath, 'utf8'));
  return parseReviewNotes(json);
}

function teamDisplayName(teamId: string): string {
  const name = getTeam(teamId)?.team.name;
  if (name) return name;
  return teamId.charAt(0).toUpperCase() + teamId.slice(1);
}

async function main() {
  const { team, base, refs, out } = parseArgs(process.argv.slice(2));
  const refsDir = refs ?? process.env.UNIFORM_REFS_DIR;
  if (!refsDir) {
    console.warn(
      'No refs directory given (--refs or UNIFORM_REFS_DIR) — running without references.'
    );
  }

  const root = repoRoot();
  const baseCommit = resolveBaseCommit(root, base);
  const teamRows = UNIFORMS.filter((row) => row.teamId === team).map((row) => ({
    ...row,
    id: `${row.teamId}-${row.slug}-${row.yearStart}`,
  }));
  if (teamRows.length === 0) {
    throw new Error(`no uniform rows for team "${team}"`);
  }

  const notes = loadReviewNotes(refsDir, team);
  for (const rowId of Object.keys(notes.crops)) {
    if (!teamRows.some((row) => row.id === rowId)) {
      console.warn(`review.json: crop "${rowId}" matches no design for team "${team}"`);
    }
  }
  const { references, croppedByRowId } = refsDir
    ? await loadReferences(refsDir, team, notes.crops)
    : { references: [], croppedByRowId: new Map<string, ImageRef>() };

  const combinations = combinationRenders(teamRows, getTeamCatalog);
  const combinationsByRowId = new Map<string, typeof combinations>();
  for (const combination of combinations) {
    const list = combinationsByRowId.get(combination.rowId) ?? [];
    list.push(combination);
    combinationsByRowId.set(combination.rowId, list);
  }

  const designs: ReviewDesign[] = [];
  for (const row of teamRows) {
    const after = await renderAfter(row);
    const beforeBuffer = readBefore(root, baseCommit, row.id);
    const before = beforeBuffer
      ? { src: toDataUri(beforeBuffer), alt: `${row.id} before` }
      : undefined;
    const rowCombinations = combinationsByRowId.get(row.id) ?? [];
    const combinationImages: ReviewDesign['combinations'] = [];
    for (const combination of rowCombinations) {
      const raster = await renderKitWebp(row, combination.constructionKey);
      combinationImages.push({
        label: combination.label,
        image: { src: toDataUri(raster), alt: `${row.id} ${combination.label}` },
      });
    }
    designs.push({
      rowId: row.id,
      name: row.name,
      reference: croppedByRowId.get(row.id),
      before,
      after,
      combinations: combinationImages,
    });
  }

  const catalog = getTeamCatalog(team);
  const needsSource = catalog
    ? catalog.designs.flatMap((design) =>
        design.periods
          .filter((period) => period.to !== undefined && period.source === NEEDS_SOURCE)
          .map((period) => ({
            rowId: designRowId(team, design),
            from: period.from,
            to: period.to as number,
          }))
      )
    : [];

  const html = buildReviewSheet({
    teamName: teamDisplayName(team),
    baseRef: base,
    designs,
    references,
    notes,
    needsSource,
  });

  const resolvedOut = resolveOutPath(out, team);
  writeFileSync(resolvedOut, html);
  const bytes = Buffer.byteLength(html);
  const mb = bytes / (1024 * 1024);
  console.log(`${resolvedOut} (${mb.toFixed(1)} MB)`);
  if (bytes > MAX_ARTIFACT_BYTES) {
    console.warn(
      `review sheet is ${mb.toFixed(1)} MB, too large to publish as an Artifact -- add crops (review.json) to shrink it`
    );
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
