#!/usr/bin/env tsx
/**
 * diff-pr-screenshots.mts — screenmap-style before/after visual diff for the PNGs
 * captured by ios/scripts/screenshot-check.sh (or the iOS PR screenshot workflow).
 *
 * For each target captured on both sides it emits:
 *   - <out>/<target>.diff.png — the AFTER image with changed pixels tinted red and
 *     each significant changed region boxed (so a reviewer sees at a glance where
 *     the diff sits, without a thumbnail in each hand).
 *   - <out>/summary.json      — per-target changed %, region bounding boxes, verdict.
 *
 * Pixels whose per-channel delta exceeds --threshold count as changed; changed
 * pixels are grouped into connected regions and only regions of >= --min-area
 * pixels are boxed (filters font anti-aliasing noise). The status bar should be
 * frozen (screenshot-check.sh does this with `simctl status_bar override`) so
 * before/after time doesn't pollute the diff.
 *
 * Uses `sharp`, already a devDependency — no new deps.
 *
 * Usage:
 *   tsx scripts/diff-pr-screenshots.mts \
 *     --before <dir> --after <dir> [--out <dir>] \
 *     [--threshold 48] [--min-area 96] [--max-regions 12]
 *
 * Dirs contain the xcresult-exported PNGs (e.g. `field-abc123.png`). Pairs are
 * matched by the leading token of the filename (the XCTAttachment name).
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

interface Region {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
}

const HELP = `diff-pr-screenshots.mts — before/after visual diff for PR screenshots

Usage:
  tsx scripts/diff-pr-screenshots.mts --before <dir> --after <dir> [opts]

Options:
  --before <dir>     Directory of "before" PNGs (required)
  --after <dir>      Directory of "after" PNGs (required)
  --out <dir>        Output dir for .diff.png + summary.json (default: ./diff)
  --threshold <n>    Per-pixel delta (sum of |RGB| diffs) to count as changed (default: 48)
  --min-area <n>     Min changed-region size in px to box (default: 96)
  --max-regions <n>  Max regions boxed per target (default: 12)
  -h, --help         This help
`;

function parseArgs(argv: string[]): {
  before: string;
  after: string;
  out: string;
  threshold: number;
  minArea: number;
  maxRegions: number;
} {
  const a = { before: '', after: '', out: 'diff', threshold: 48, minArea: 96, maxRegions: 12 };
  for (let i = 0; i < argv.length; i++) {
    const v = (k: string) => {
      const val = argv[++i];
      if (val === undefined) throw new Error(`${k} needs a value`);
      return val;
    };
    switch (argv[i]) {
      case '--before':
        a.before = v('--before');
        break;
      case '--after':
        a.after = v('--after');
        break;
      case '--out':
        a.out = v('--out');
        break;
      case '--threshold':
        a.threshold = Number(v('--threshold'));
        break;
      case '--min-area':
        a.minArea = Number(v('--min-area'));
        break;
      case '--max-regions':
        a.maxRegions = Number(v('--max-regions'));
        break;
      case '-h':
      case '--help':
        console.log(HELP);
        process.exit(0);
        break;
      default:
        throw new Error(`unknown flag: ${argv[i]}`);
    }
  }
  if (!a.before || !a.after) throw new Error('--before and --after are required');
  return a;
}

/** Leading token of the attachment filename, e.g. "field-abc123.png" -> "field". */
function stem(path: string): string {
  return basename(path)
    .replace(/\.[^.]+$/, '')
    .split(/[-_. ]+/)[0];
}

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

async function loadRaw(png: string): Promise<RawImage> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/** Union-Find-free flood fill; returns sizable regions (count >= minArea), largest first. */
function regions(
  mask: Uint8Array,
  w: number,
  h: number,
  minArea: number,
  maxRegions: number
): Region[] {
  const labels = new Int32Array(w * h).fill(-1);
  let nextLabel = 0;
  const found: Region[] = [];
  const stack = new Int32Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i] !== -1) continue;
    let sp = 0;
    stack[sp++] = i;
    labels[i] = nextLabel;
    let minX = w,
      minY = h,
      maxX = -1,
      maxY = -1,
      count = 0;
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      count++;
      const nbrs = [p - 1, p + 1, p - w, p + w];
      for (const n of nbrs) {
        if (n < 0 || n >= mask.length) continue;
        const nx = n % w;
        const ny = (n / w) | 0;
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue; // 4-adjacency (kills row-wrap)
        if (mask[n] && labels[n] === -1) {
          labels[n] = nextLabel;
          stack[sp++] = n;
        }
      }
    }
    nextLabel++;
    if (count >= minArea) found.push({ minX, minY, maxX, maxY, count });
  }
  found.sort((u, v) => v.count - u.count);
  return found.slice(0, maxRegions);
}

function paintOverlay(after: RawImage, mask: Uint8Array, boxes: Region[]): Buffer {
  const { width: w, height: h } = after;
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = after.data[i * 3];
    const g = after.data[i * 3 + 1];
    const b = after.data[i * 3 + 2];
    if (mask[i]) {
      // red tint over changed pixels
      out[i * 4] = 255;
      out[i * 4 + 1] = (g >> 1) & 0xff;
      out[i * 4 + 2] = (b >> 1) & 0xff;
    } else {
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
    }
    out[i * 4 + 3] = 255;
  }
  // solid red boxes
  const box = (x0: number, y0: number, x1: number, y1: number) => {
    const px = (x: number, y: number) => {
      const p = (y * w + x) * 4;
      out[p] = 255;
      out[p + 1] = 0;
      out[p + 2] = 0;
      out[p + 3] = 255;
    };
    for (let x = x0; x <= x1; x++) {
      px(x, y0);
      px(x, y1);
    }
    for (let y = y0; y <= y1; y++) {
      px(x0, y);
      px(x1, y);
    }
  };
  for (const r of boxes) box(r.minX, r.minY, r.maxX, r.maxY);
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.before) || !existsSync(args.after)) {
    console.error('ERROR: --before or --after dir does not exist');
    process.exit(1);
  }
  mkdirSync(args.out, { recursive: true });

  const beforeFiles = readdirSync(args.before).filter((f) => /\.png$/i.test(f));
  const afterFiles = readdirSync(args.after).filter((f) => /\.png$/i.test(f));
  // Pair by stem (leading token): xcresult exports get a different UUID suffix per
  // run (field-abc1.png vs field-xyz2.png) so filenames never match across sides.
  const beforeByStem = new Map<string, string>();
  for (const f of beforeFiles) beforeByStem.set(stem(f), f);
  const afterByStem = new Map<string, string>();
  for (const f of afterFiles) afterByStem.set(stem(f), f);
  const stems = [...beforeByStem.keys()].filter((s) => afterByStem.has(s));
  const pairs = stems.map((s) => {
    const before = beforeByStem.get(s);
    const after = afterByStem.get(s);
    if (!before || !after) {
      throw new Error(`internal: no path for paired stem '${s}'`);
    }
    return { stem: s, before, after };
  });
  if (pairs.length === 0) {
    console.error('ERROR: no matching before/after PNG pairs (same leading filename token)');
    process.exit(1);
  }

  const summary: Record<string, unknown> = {};

  for (const pair of pairs) {
    const beforePath = join(args.before, pair.before);
    const afterPath = join(args.after, pair.after);
    const [before, after] = await Promise.all([loadRaw(beforePath), loadRaw(afterPath)]);
    if (before.width !== after.width || before.height !== after.height) {
      console.log(
        `  ${pair.stem}: SKIPPED (dimension mismatch before=${before.width}x${before.height} after=${after.width}x${after.height})`
      );
      summary[pair.stem] = { verdict: 'skipped', reason: 'dimension mismatch' };
      continue;
    }
    const { width: w, height: h } = before;
    const mask = new Uint8Array(w * h);
    let changedPx = 0;
    for (let i = 0; i < w * h; i++) {
      const d =
        Math.abs(before.data[i * 3] - after.data[i * 3]) +
        Math.abs(before.data[i * 3 + 1] - after.data[i * 3 + 1]) +
        Math.abs(before.data[i * 3 + 2] - after.data[i * 3 + 2]);
      if (d > args.threshold) {
        mask[i] = 1;
        changedPx++;
      }
    }
    const regs = regions(mask, w, h, args.minArea, args.maxRegions);
    const pct = (changedPx / (w * h)) * 100;
    const verdict = regs.length === 0 ? 'unchanged' : 'changed';

    if (verdict === 'changed') {
      const overlay = paintOverlay(after, mask, regs);
      await sharp(overlay, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toFile(join(args.out, `${pair.stem}.diff.png`));
    }

    const boxes = regs.map((r) => ({
      x: r.minX,
      y: r.minY,
      width: r.maxX - r.minX + 1,
      height: r.maxY - r.minY + 1,
    }));
    console.log(
      `  ${pair.stem}: ${verdict} — ${pct.toFixed(2)}% pixels, ${regs.length} region(s)${boxes.length ? ' ' + JSON.stringify(boxes) : ''}`
    );
    summary[pair.stem] = { verdict, changedPct: Number(pct.toFixed(2)), regions: boxes };
  }

  console.log(
    `Diff → ${args.out} (${Object.values(summary).filter((s) => (s as { verdict?: string }).verdict === 'changed').length} changed)`
  );
  writeFileSync(join(args.out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  process.exit(1);
});
