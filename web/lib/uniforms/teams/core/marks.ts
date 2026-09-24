// Marks are polygon vector art (helmet decals, sleeve logos) stored once in their own coordinate
// space and placed on the mannequin by a named anchor. A mark's paths are absolute M/L/Z polygons
// only -- curve commands are not supported yet. The placer normalises them to the mark box, fits
// that box to the anchor and formats each point to one decimal, the same arithmetic the drawing
// scripts' Box uses, so a mark moved here from a script renders identically.
import type { PaletteRef, PartLayer } from './parts';
import type { UniformSurface } from './types';

export interface MarkPath<S extends string = string> {
  slot: S;
  d: string;
}

export interface Mark<S extends string = string> {
  // [x0, y0, x1, y1] in the mark's own space. Placement normalises to it, so it also fixes the
  // mark's aspect.
  box: readonly [number, number, number, number];
  // Paint order.
  paths: readonly MarkPath<S>[];
}

// Art already in mannequin space with its paint bound: emitted as-is, never normalised or
// re-fitted. Existing helmet art uses this, so its layers keep every property they were drawn with.
export interface PlacedMark {
  placed: true;
  layers: readonly PartLayer[];
}

export function placed(layers: readonly PartLayer[]): PlacedMark {
  return { placed: true, layers };
}

export type AnchorName = 'helmet-side' | 'sleeve-left' | 'sleeve-right';

interface Anchor {
  surface: UniformSurface;
  // Left edge, width and vertical centre of the placement box in mannequin space. The height
  // follows the mark's aspect.
  x0: number;
  w: number;
  cy: number;
  // The left sleeve shows its mark mirrored so both face outward.
  mirror: boolean;
  idSuffix: string;
}

export const ANCHORS: Record<AnchorName, Anchor> = {
  'helmet-side': { surface: 'helmet', x0: 154, w: 310, cy: 293, mirror: false, idSuffix: '' },
  'sleeve-left': {
    surface: 'sleeve-left',
    x0: 24,
    w: 74,
    cy: 505,
    mirror: true,
    idSuffix: '-left',
  },
  'sleeve-right': {
    surface: 'sleeve-right',
    x0: 490,
    w: 74,
    cy: 505,
    mirror: false,
    idSuffix: '-right',
  },
};

// One decimal, matching Python's '%.1f'. A value whose binary form is an exact tie at the second
// decimal has a fractional part of .25 or .75; Python rounds it to even, Number.toFixed rounds it
// up. They only disagree on .25.
export function fmt1(v: number): string {
  const a = Math.abs(v);
  if (a % 1 === 0.25) return `${v < 0 ? '-' : ''}${Math.floor(a)}.2`;
  return v.toFixed(1);
}

type Point = [number, number];

type Token = { kind: 'M' | 'L' | 'Z' } | { kind: 'num'; value: number };

// Splits a path into command and number tokens, requiring the whole string to be consumed by
// commands, numbers, commas and whitespace with no gaps -- a malformed or trailing fragment
// (an unterminated number, stray characters) leaves a gap the scan detects.
function tokenize(d: string): Token[] {
  const tokens: Token[] = [];
  const re = /[MLZ]|-?\d+(?:\.\d+)?|[,\s]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) {
    if (match.index !== lastIndex) {
      throw new Error(`mark path has unparsed text at position ${lastIndex}`);
    }
    const text = match[0];
    lastIndex = re.lastIndex;
    if (text === 'M' || text === 'L' || text === 'Z') {
      tokens.push({ kind: text });
    } else if (/^[,\s]+$/.test(text)) {
      continue;
    } else {
      const value = Number(text);
      if (!Number.isFinite(value)) throw new Error(`mark path has a malformed number "${text}"`);
      tokens.push({ kind: 'num', value });
    }
  }
  if (lastIndex !== d.length) {
    throw new Error(`mark path has unparsed text at position ${lastIndex}`);
  }
  return tokens;
}

function readPoint(tokens: Token[], i: number): Point {
  const x = tokens[i];
  const y = tokens[i + 1];
  if (!x || x.kind !== 'num' || !y || y.kind !== 'num') {
    throw new Error('mark path command is missing a coordinate');
  }
  return [x.value, y.value];
}

function subpaths(d: string): Point[][] {
  if (d.trim() === '') throw new Error('mark path is empty');
  if (!/^[MLZ\d\s.,-]*$/.test(d)) throw new Error('mark paths must use absolute M/L/Z only');
  const tokens = tokenize(d);
  const out: Point[][] = [];
  let current: Point[] | null = null;
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.kind === 'M') {
      if (current) throw new Error('mark path has a subpath not closed with Z before the next M');
      current = [readPoint(tokens, i + 1)];
      i += 3;
    } else if (token.kind === 'L') {
      if (!current) throw new Error('mark path has L before M');
      current.push(readPoint(tokens, i + 1));
      i += 3;
    } else if (token.kind === 'Z') {
      if (!current) throw new Error('mark path has Z without an open subpath');
      out.push(current);
      current = null;
      i += 1;
    } else {
      throw new Error('mark path has a coordinate pair without a command');
    }
  }
  if (current) throw new Error('mark path has an unclosed trailing subpath');
  return out;
}

export function boundsOf(d: string): [number, number, number, number] {
  const pts = subpaths(d).flat();
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function placeMark<S extends string>(
  idPrefix: string,
  mark: Mark<S>,
  anchorName: AnchorName,
  slots: Record<S, PaletteRef | null>
): PartLayer[] {
  const anchor = ANCHORS[anchorName];
  const [bx0, by0, bx1, by1] = mark.box;
  if (bx1 - bx0 <= 0 || by1 - by0 <= 0) {
    throw new Error(`${idPrefix}: mark box must have positive width and height`);
  }
  const aspect = (bx1 - bx0) / (by1 - by0);
  const h = anchor.w / aspect;
  const y0 = anchor.cy - h / 2;
  const at = ([x, y]: Point) => {
    const u0 = ((x - bx0) * 100) / (bx1 - bx0);
    const u = anchor.mirror ? 100 - u0 : u0;
    const v = ((y - by0) * 100) / (by1 - by0);
    return `${fmt1(anchor.x0 + (u * anchor.w) / 100)},${fmt1(y0 + (v * h) / 100)}`;
  };
  return mark.paths.flatMap(({ slot, d }): PartLayer[] => {
    if (!(slot in slots)) throw new Error(`${idPrefix}: mark slot "${slot}" is not mapped`);
    const color = slots[slot];
    if (color === null) return [];
    const placed = subpaths(d)
      .map((pts) => {
        const [first, ...rest] = pts.map(at);
        return `M${first} ${rest.map((p) => `L${p}`).join(' ')} Z`;
      })
      .join(' ');
    return [
      {
        id: `${idPrefix}-${slot}${anchor.idSuffix}`,
        surface: anchor.surface,
        d: placed,
        clip: true,
        kind: 'fill',
        fill: color,
      },
    ];
  });
}

// Both sleeves, interleaved left then right for each slot, the order sleeve primitives use.
export function placeMarkOnSleeves<S extends string>(
  idPrefix: string,
  mark: Mark<S>,
  slots: Record<S, PaletteRef | null>
): PartLayer[] {
  const left = placeMark(idPrefix, mark, 'sleeve-left', slots);
  const right = placeMark(idPrefix, mark, 'sleeve-right', slots);
  return left.flatMap((layer, i) => [layer, right[i]]);
}
