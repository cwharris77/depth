// Marks are vector art (helmet decals, sleeve logos, a team's own shoulder shapes) stored once in
// their own coordinate space and placed on the mannequin by a named anchor. A mark's paths use
// absolute M/L/H/V/C/Q/Z commands, each coordinate group with its own command letter. The placer
// normalises every point, control points included, to the mark box, fits that box to the anchor and
// formats each point to one decimal, the same arithmetic the drawing scripts' Box uses, so a
// polygon mark moved here from a script renders identically. The fit is a scale and a shift, so a
// curve placed this way is the same curve.
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

export type AnchorName =
  'helmet-side' | 'sleeve-left' | 'sleeve-right' | 'shoulder-left' | 'shoulder-right';

interface Anchor {
  surface: UniformSurface;
  // Left edge, width and vertical centre of the placement box in mannequin space. The height
  // follows the mark's aspect.
  x0: number;
  w: number;
  cy: number;
  // The left sleeve and shoulder show their mark mirrored so both face outward.
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
  // The front of each shoulder, from the collar's edge out past the sleeve's outer edge (the
  // jersey clip trims the overshoot). A shoulder mark is drawn for the right shoulder.
  'shoulder-left': {
    surface: 'sleeve-left',
    x0: 12,
    w: 220,
    cy: 446,
    mirror: true,
    idSuffix: '-left',
  },
  'shoulder-right': {
    surface: 'sleeve-right',
    x0: 356,
    w: 220,
    cy: 446,
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

// Coordinates each command takes; H and V take one number and are read as a line to the point.
const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4 } as const;
type Command = keyof typeof ARITY;
type Segment = { cmd: 'M' | 'L' | 'C' | 'Q'; pts: Point[] };

type Token = { kind: Command | 'Z' } | { kind: 'num'; value: number };

// Splits a path into command and number tokens, requiring the whole string to be consumed by
// commands, numbers, commas and whitespace with no gaps -- a malformed or trailing fragment
// (an unterminated number, stray characters) leaves a gap the scan detects.
function tokenize(d: string): Token[] {
  const tokens: Token[] = [];
  const re = /[MLHVCQZ]|-?\d+(?:\.\d+)?|[,\s]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) {
    if (match.index !== lastIndex) {
      throw new Error(`mark path has unparsed text at position ${lastIndex}`);
    }
    const text = match[0];
    lastIndex = re.lastIndex;
    if (/^[MLHVCQZ]$/.test(text)) {
      tokens.push({ kind: text as Command | 'Z' });
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

function readNumbers(tokens: Token[], i: number, n: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = tokens[i + k];
    if (!t || t.kind !== 'num') throw new Error('mark path command is missing a coordinate');
    out.push(t.value);
  }
  return out;
}

// Closed subpaths, each a list of segments starting with its M.
function subpaths(d: string): Segment[][] {
  if (d.trim() === '') throw new Error('mark path is empty');
  if (!/^[MLHVCQZ\d\s.,-]*$/.test(d)) {
    throw new Error('mark paths must use absolute M/L/H/V/C/Q/Z only');
  }
  const tokens = tokenize(d);
  const out: Segment[][] = [];
  let current: Segment[] | null = null;
  let at: Point = [0, 0];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.kind === 'num') throw new Error('mark path has a coordinate pair without a command');
    if (token.kind === 'Z') {
      if (!current) throw new Error('mark path has Z without an open subpath');
      out.push(current);
      current = null;
      i += 1;
      continue;
    }
    const n = readNumbers(tokens, i + 1, ARITY[token.kind]);
    i += 1 + n.length;
    if (token.kind === 'M') {
      if (current) throw new Error('mark path has a subpath not closed with Z before the next M');
      at = [n[0], n[1]];
      current = [{ cmd: 'M', pts: [at] }];
      continue;
    }
    if (!current) throw new Error(`mark path has ${token.kind} before M`);
    let segment: Segment;
    if (token.kind === 'H') segment = { cmd: 'L', pts: [[n[0], at[1]]] };
    else if (token.kind === 'V') segment = { cmd: 'L', pts: [[at[0], n[0]]] };
    else {
      const pts: Point[] = [];
      for (let k = 0; k < n.length; k += 2) pts.push([n[k], n[k + 1]]);
      segment = { cmd: token.kind, pts };
    }
    current.push(segment);
    at = segment.pts[segment.pts.length - 1];
  }
  if (current) throw new Error('mark path has an unclosed trailing subpath');
  return out;
}

// Control points included, so a curve's box may be a little larger than the curve itself.
export function boundsOf(d: string): [number, number, number, number] {
  const pts = subpaths(d)
    .flat()
    .flatMap((segment) => segment.pts);
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
      .map((segments) => {
        const drawn = segments.map(({ cmd, pts }) => `${cmd}${pts.map(at).join(' ')}`);
        return `${drawn.join(' ')} Z`;
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

// Both sleeves or both shoulders, interleaved left then right for each slot, the order sleeve
// primitives use.
export function placeMarkOnPair<S extends string>(
  idPrefix: string,
  mark: Mark<S>,
  pair: 'sleeves' | 'shoulders',
  slots: Record<S, PaletteRef | null>
): PartLayer[] {
  const side = pair === 'sleeves' ? 'sleeve' : 'shoulder';
  const left = placeMark(idPrefix, mark, `${side}-left`, slots);
  const right = placeMark(idPrefix, mark, `${side}-right`, slots);
  return left.flatMap((layer, i) => [layer, right[i]]);
}
