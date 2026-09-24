// Marks are fixed vector art (decals, logos, wordmarks) stored once in their own coordinate space
// and placed on the mannequin by a named anchor. A mark's paths are absolute M/L/Z polygons; the
// placer normalises them to the mark box, fits that box to the anchor and formats each point to
// one decimal, the same arithmetic the drawing scripts' Box uses, so a mark moved here from a
// script renders identically.
import type { PaletteRef, PartLayer } from './parts';
import type { UniformSurface } from './types';

export interface MarkPath {
  slot: string;
  d: string;
}

export interface Mark {
  // [x0, y0, x1, y1] in the mark's own space. Placement normalises to it, so it also fixes the
  // mark's aspect.
  box: readonly [number, number, number, number];
  // Paint order.
  paths: readonly MarkPath[];
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

function subpaths(d: string): Point[][] {
  if (!/^[MLZ\d\s.,-]*$/.test(d)) throw new Error('mark paths must use absolute M/L/Z only');
  const out: Point[][] = [];
  let current: Point[] | null = null;
  for (const [, cmd, x, y] of d.matchAll(/([MLZ])\s*(?:(-?[\d.]+)[,\s]+(-?[\d.]+))?/g)) {
    if (cmd === 'Z') {
      if (current) out.push(current);
      current = null;
      continue;
    }
    if (cmd === 'M') current = [];
    if (!current) throw new Error('mark path has L before M');
    current.push([Number(x), Number(y)]);
  }
  return out;
}

export function boundsOf(d: string): [number, number, number, number] {
  const pts = subpaths(d).flat();
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function placeMark(
  idPrefix: string,
  mark: Mark,
  anchorName: AnchorName,
  slots: Record<string, PaletteRef | null>
): PartLayer[] {
  const anchor = ANCHORS[anchorName];
  const [bx0, by0, bx1, by1] = mark.box;
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
export function placeMarkOnSleeves(
  idPrefix: string,
  mark: Mark,
  slots: Record<string, PaletteRef | null>
): PartLayer[] {
  const left = placeMark(idPrefix, mark, 'sleeve-left', slots);
  const right = placeMark(idPrefix, mark, 'sleeve-right', slots);
  return left.flatMap((layer, i) => [layer, right[i]]);
}
