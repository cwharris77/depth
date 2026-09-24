import type { PartLayer } from './parts';

// Construction geometry that is genuinely shared between team modules — not a grab-bag. Anything
// here must be a fact about the mannequin rather than about a team, so that a second team adopting
// it is reuse and not coincidence. Team-specific paths stay in that team's module.

// A band hugging the crown silhouette from the back quarter to the front, which is all a side view
// can show of a helmet center stripe. It thins toward the front to echo the shell's taper. Authored
// in raw helmet coordinates (x:139-802, y:65-674) against the shared mannequin shell, so it lands
// identically for every team; each team supplies only its own color.
export const HELMET_CROWN_STRIPE_PATH =
  'M236,127 L252,115 L302,91 L334,79 L374,69 L402,65 L455,65 L509,73 L547,85 L593,109 L631,137 L625,146 L589,119 L545,96 L508,85 L455,78 L402,79 L375,84 L336,95 L305,108 L257,133 L242,146 Z';

// The canonical shallow V used by the modern mannequin. Teams own the band widths, colors, and
// layer IDs; only this exact mannequin path is shared.
export const GENERIC_COLLAR_PATH = 'M206,388 L294,455 L386,388';

// Closed rounded collar used by period uniforms that predate the modern V templates. Era-specific
// teams still own their trim widths and colors; this only centralizes the mannequin fit.
export const LEGACY_ROUNDED_COLLAR_PATH =
  'M229,388 Q229,405 246,414 L294,414 L342,414 Q359,405 359,388';

// The neutral grey the mannequin draws its silhouette with. Parts reach it through the reserved
// `outline` paint so a team-coloured band can be delineated from a body of the same colour.
export const FIGURE_OUTLINE = '#8a9096';
// The one team-independent paint key, resolved to FIGURE_OUTLINE instead of a palette entry.
export const OUTLINE_PAINT = 'outline';

export interface ModernInsetVCollarColors {
  // Fill inside the V opening.
  interior: string;
  // The collar band, centred on the opening's edge.
  edge: string;
  inset: string;
  placket: string;
  // A band on the inner half of the collar, stopping short of the point.
  lining?: string;
  // A bar across the back of the neck, inside the collar.
  backBar?: string;
}

export interface ModernInsetVCollarOptions {
  idPrefix: string;
  colors: ModernInsetVCollarColors;
  insetId?: string;
  // Thin FIGURE_OUTLINE keylines along both edges of the collar band.
  outline?: boolean;
}

// The opening's edge as two cubic sides meeting at the point (294,464).
type Point = [number, number];
const COLLAR_SIDES: [Point, Point, Point, Point][] = [
  [
    [220, 383],
    [224, 415],
    [255, 442],
    [294, 464],
  ],
  [
    [294, 464],
    [333, 442],
    [364, 415],
    [368, 383],
  ],
];
const COLLAR_AXIS = 294;
const COLLAR_BAND_HALF = 10;
const COLLAR_LINING_REACH = 0.72; // fraction of each side, from the top, that the lining covers
const COLLAR_BACK_BAR_DEPTH = 14;
const COLLAR_OUTLINE_WIDTH = 3;

function cubic(side: [Point, Point, Point, Point], t: number): { p: Point; n: Point } {
  const [p0, p1, p2, p3] = side;
  const u = 1 - t;
  const at = (i: 0 | 1) =>
    u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
  const d = (i: 0 | 1) =>
    3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]);
  const len = Math.hypot(d(0), d(1));
  // (dy, -dx) points into the opening on both sides.
  return { p: [at(0), at(1)], n: [d(1) / len, -d(0) / len] };
}

// Samples of the edge offset by `inset` (positive = into the opening). With the full reach this is
// one run from the left top, through the point, to the right top; a shorter reach returns each
// side separately, covering that fraction of it measured from its top.
function collarOffset(inset: number, reach = 1, steps = 24): Point[][] {
  const side = (i: 0 | 1) => {
    const pts: Point[] = [];
    for (let k = 0; k <= steps; k++) {
      const f = (k / steps) * reach;
      const t = i === 0 ? f : 1 - f;
      const { p, n } = cubic(COLLAR_SIDES[i], t);
      pts.push([p[0] + n[0] * inset, p[1] + n[1] * inset]);
    }
    return i === 0 ? pts : pts.reverse();
  };
  if (reach !== 1) return [side(0), side(1)];
  // The collar is symmetric about x=294, so an offset side meets its mirror on that axis: an inner
  // offset crosses it before the point (trim there), an outer one stops short of it (extend to it).
  const left = side(0);
  let k = left.findIndex(([x]) => x >= COLLAR_AXIS);
  if (k === -1) k = left.length - 1;
  const [[x0, y0], [x1, y1]] = [left[k - 1], left[k]];
  const tip: Point = [COLLAR_AXIS, y0 + ((COLLAR_AXIS - x0) / (x1 - x0)) * (y1 - y0)];
  const half = [...left.slice(0, k), tip];
  const mirrored = half
    .slice(0, -1)
    .reverse()
    .map(([x, y]): Point => [2 * COLLAR_AXIS - x, y]);
  return [[...half, ...mirrored]];
}

const round = (n: number) => Math.round(n * 10) / 10;
const polyline = (pts: Point[]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)},${round(y)}`).join(' ');

function backBarPath(): string {
  const bottom = 383 + COLLAR_BACK_BAR_DEPTH;
  const [edge] = collarOffset(COLLAR_BAND_HALF);
  const xAt = (pts: Point[]) => {
    for (let k = 1; k < pts.length; k++) {
      const [[x0, y0], [x1, y1]] = [pts[k - 1], pts[k]];
      if ((y0 - bottom) * (y1 - bottom) <= 0) return x0 + ((bottom - y0) / (y1 - y0)) * (x1 - x0);
    }
    return pts[0][0];
  };
  const mid = Math.floor(edge.length / 2);
  const left = xAt(edge.slice(0, mid + 1));
  const right = xAt(edge.slice(mid).reverse());
  return `M${round(left)},360 H${round(right)} V${bottom} H${round(left)} Z`;
}

export function modernInsetVCollar({
  idPrefix,
  colors,
  insetId = `${idPrefix}-collar-inset`,
  outline = false,
}: ModernInsetVCollarOptions): PartLayer[] {
  const { lining } = colors;
  const stroke = (id: string, color: string, width: number, d: string): PartLayer => ({
    id: `${idPrefix}-${id}`,
    surface: 'collar',
    kind: 'stroke',
    clip: true,
    stroke: color,
    strokeWidth: width,
    d,
  });
  return [
    {
      id: `${idPrefix}-neck-opening`,
      surface: 'collar',
      kind: 'fill',
      clip: true,
      fill: colors.interior,
      d: 'M220,383 H368 C364,415 333,442 294,464 C255,442 224,415 220,383 Z',
    },
    {
      id: `${idPrefix}-collar-edge`,
      surface: 'collar',
      kind: 'stroke',
      clip: true,
      stroke: colors.edge,
      strokeWidth: 20,
      d: 'M220,383 C224,415 255,442 294,464 C333,442 364,415 368,383',
    },
    {
      id: insetId,
      surface: 'collar',
      kind: 'stroke',
      clip: true,
      stroke: colors.inset,
      strokeWidth: 8,
      d: 'M220,383 C224,415 255,442 291,462 M297,462 C333,442 364,415 368,383',
    },
    {
      id: `${idPrefix}-collar-placket`,
      surface: 'collar',
      kind: 'fill',
      clip: true,
      fill: colors.placket,
      d: 'M281,452 L294,459 L307,452 L302,479 L286,479 Z',
    },
    ...(colors.backBar
      ? [
          {
            id: `${idPrefix}-collar-back`,
            surface: 'collar',
            kind: 'fill',
            clip: true,
            fill: colors.backBar,
            d: backBarPath(),
          } satisfies PartLayer,
        ]
      : []),
    ...(lining
      ? collarOffset(COLLAR_BAND_HALF / 2, COLLAR_LINING_REACH).map((side, i) =>
          stroke(`collar-lining-${i ? 'right' : 'left'}`, lining, COLLAR_BAND_HALF, polyline(side))
        )
      : []),
    ...(outline
      ? [-COLLAR_BAND_HALF, COLLAR_BAND_HALF].map((inset, i) =>
          stroke(
            `collar-outline-${i ? 'inner' : 'outer'}`,
            OUTLINE_PAINT,
            COLLAR_OUTLINE_WIDTH,
            polyline(collarOffset(inset)[0])
          )
        )
      : []),
  ];
}
