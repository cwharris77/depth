import type { PartLayer } from './parts';
import { nflShield } from './nfl-shield';

// Construction geometry that is genuinely shared between team modules — not a grab-bag. Anything
// here must be a fact about the mannequin rather than about a team, so that a second team adopting
// it is reuse and not coincidence. Team-specific paths stay in that team's module.

// A band hugging the crown silhouette from the back quarter to the front, which is all a side view
// can show of a helmet center stripe. It thins toward the front to echo the shell's taper. Authored
// in raw helmet coordinates (x:139-802, y:65-674) against the shared mannequin shell, so it lands
// identically for every team; each team supplies only its own color.
export const HELMET_CROWN_STRIPE_PATH =
  'M236,127 L252,115 L302,91 L334,79 L374,69 L402,65 L455,65 L509,73 L547,85 L593,109 L631,137 L625,146 L589,119 L545,96 L508,85 L455,78 L402,79 L375,84 L336,95 L305,108 L257,133 L242,146 Z';

// The athletic 3 on the side panel of the shared helmet shell, in raw helmet coordinates. It fits
// the one shell every team draws, so a team supplies only its colour.
export const HELMET_NUMBER_PATH =
  'M375.3,250 L409.7,250 L420,258.5 L420,281.5 L410.3,289 L420,297 L420,321.1 L409.1,330 L375.3,330 L365,321.5 L365,309.3 L379.9,309.3 L379.9,318.3 L404.6,318.3 L404.6,297 L387.4,297 L387.4,284.8 L404.6,284.8 L404.6,262.3 L379.9,262.3 L379.9,270.7 L365,270.7 L365,258.5 Z';

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
  // The bar across the back of the neck, inside the collar. Always drawn; defaults to `edge`.
  backBar?: string;
}

export interface ModernInsetVCollarOptions {
  idPrefix: string;
  colors: ModernInsetVCollarColors;
  insetId?: string;
  // Thin FIGURE_OUTLINE keylines along both edges of the collar band.
  outline?: boolean;
}

// The band centre guides the optional lining between the independent collar contours.
type Point = [number, number];
const COLLAR_SIDES: [Point, Point, Point, Point][] = [
  [
    [220, 383],
    [212, 417],
    [258, 451],
    [294, 477],
  ],
  [
    [294, 477],
    [330, 451],
    [376, 417],
    [368, 383],
  ],
];
const COLLAR_OUTER =
  'M204,383 C198,410 204,427 224,444 L288,491 Q294,497 300,491 L364,444 C384,427 390,410 384,383';
const COLLAR_INNER =
  'M228,383 L228,405 C230,420 245,428 258,439 L290,456 Q294,458 298,456 L330,439 C343,428 358,420 360,405 L360,383';
const COLLAR_AXIS = 294;
const COLLAR_BAND_HALF = 14;
const COLLAR_LINING_REACH = 0.72; // fraction of each side, from the top, that the lining covers
const COLLAR_BACK_BAR_DEPTH = 22;
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

function backBarSpan(): { left: number; right: number; bottom: number } {
  return { left: 228, right: 360, bottom: 383 + COLLAR_BACK_BAR_DEPTH };
}

function backBarPath(): string {
  const { left, right, bottom } = backBarSpan();
  return `M${left},360 H${right} V${bottom} H${left} Z`;
}

function backBarKeyline(): string {
  const { left, right, bottom } = backBarSpan();
  return `M${left},${bottom} H${right}`;
}

// A narrower, deeper V than the inset V: one band runs down both sides to a point and across the
// back of the neck, with a centre trim that follows it all the way round. The opening is a V
// from (246,409) to the point at (294,476); the outer edge reaches (294,507).
const NARROW_V_OUTER = 'M211,383 C211,450 248,492 294,507 C340,492 377,450 377,383';
const NARROW_V_OPENING = 'M246,409 C248,435 271,463 294,476 C317,463 340,435 342,409 Z';
// The band's centre line: down the left side to the point, up the right, across the back bar.
const NARROW_V_TRIM = 'M228,396 C229,440 265,482 294,491.5 C323,482 359,440 360,396 Z';
const NARROW_V_TRIM_WIDTH = 7;
// The figure's own outline weight: heavier than the inset V's keylines, so the band reads slimmer.
const NARROW_V_OUTLINE_WIDTH = 4;
// Each hairline of trim piping shows this much of its colour on either side of the trim.
const NARROW_V_PIPING = 1.5;

export interface NarrowVCollarOptions {
  idPrefix: string;
  colors: {
    // Fill inside the V opening.
    interior: string;
    band: string;
    trim?: string;
    // Hairlines along both edges of the trim.
    trimEdge?: string;
  };
  // Thin FIGURE_OUTLINE keylines along the band's outer edge and round the opening.
  outline?: boolean;
}

export function narrowVCollar({
  idPrefix,
  colors,
  outline = false,
}: NarrowVCollarOptions): PartLayer[] {
  const { trim, trimEdge } = colors;
  const fill = (id: string, color: string, d: string): PartLayer => ({
    id: `${idPrefix}-${id}`,
    surface: 'collar',
    kind: 'fill',
    clip: true,
    fill: color,
    d,
  });
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
    fill('collar-band', colors.band, `${NARROW_V_OUTER} Z`),
    ...(trim && trimEdge
      ? [
          stroke(
            'collar-trim-edge',
            trimEdge,
            NARROW_V_TRIM_WIDTH + 2 * NARROW_V_PIPING,
            NARROW_V_TRIM
          ),
        ]
      : []),
    ...(trim ? [stroke('collar-trim', trim, NARROW_V_TRIM_WIDTH, NARROW_V_TRIM)] : []),
    fill('neck-opening', colors.interior, NARROW_V_OPENING),
    ...(outline
      ? [
          stroke('collar-outline-outer', OUTLINE_PAINT, NARROW_V_OUTLINE_WIDTH, NARROW_V_OUTER),
          stroke('collar-outline-inner', OUTLINE_PAINT, NARROW_V_OUTLINE_WIDTH, NARROW_V_OPENING),
        ]
      : []),
    ...nflShield(idPrefix, 'collar-narrow-v'),
  ];
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
      d: `${COLLAR_OUTER} Z`,
    },
    {
      id: `${idPrefix}-collar-edge`,
      surface: 'collar',
      kind: 'fill',
      clip: true,
      fill: colors.edge,
      d: `${COLLAR_OUTER} L360,383 L360,405 C358,420 343,428 330,439 L298,456 Q294,458 290,456 L258,439 C245,428 230,420 228,405 L228,383 Z`,
    },
    {
      id: insetId,
      surface: 'collar',
      kind: 'stroke',
      clip: true,
      stroke: colors.inset,
      strokeWidth: 8,
      d: 'M216,383 C210,414 219,429 243,447 L290,477 M298,477 L345,447 C369,429 378,414 372,383',
    },
    {
      id: `${idPrefix}-collar-placket`,
      surface: 'collar',
      kind: 'fill',
      clip: true,
      fill: colors.placket,
      d: 'M268,451 L294,463 L320,451 L294,492 Z',
    },
    {
      id: `${idPrefix}-collar-back`,
      surface: 'collar',
      kind: 'fill',
      clip: true,
      fill: colors.backBar ?? colors.edge,
      d: backBarPath(),
    },
    ...(lining
      ? collarOffset(COLLAR_BAND_HALF / 2, COLLAR_LINING_REACH).map((side, i) =>
          stroke(`collar-lining-${i ? 'right' : 'left'}`, lining, COLLAR_BAND_HALF, polyline(side))
        )
      : []),
    ...(outline
      ? [COLLAR_OUTER, COLLAR_INNER]
          .map((contour, i) =>
            stroke(
              `collar-outline-${i ? 'inner' : 'outer'}`,
              OUTLINE_PAINT,
              COLLAR_OUTLINE_WIDTH,
              contour
            )
          )
          .concat(
            stroke('collar-outline-back', OUTLINE_PAINT, COLLAR_OUTLINE_WIDTH, backBarKeyline())
          )
      : []),
    ...[
      'M268,448 C265,461 271,475 283,487 L283,466 Z',
      'M320,448 C323,461 317,475 305,487 L305,466 Z',
      'M271,453 C270,463 274,475 280,480 M275,458 C275,466 278,476 283,480',
      'M317,453 C318,463 314,475 308,480 M313,458 C313,466 310,476 305,480',
    ].map((d, i) => stroke(`collar-rib-${i}`, OUTLINE_PAINT, 1.3, d)),
    ...nflShield(idPrefix),
  ];
}
