// Miami's own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import {
  DOLPHINS_DECAL_DOLPHIN_PATH,
  DOLPHINS_DECAL_NAVY_PATH,
  DOLPHINS_DECAL_SUNBURST_PATH,
  DOLPHINS_SLASH_LEFT,
  DOLPHINS_SLASH_RIGHT,
  DOLPHINS_SLEEVE_X_LEFT,
  DOLPHINS_SLEEVE_X_RIGHT,
  DOLPHINS_TB_DECAL_DOLPHIN_PATH,
  DOLPHINS_TB_DECAL_RING_PATH,
  DOLPHINS_TB_STRIPE_BOUNDS,
  DOLPHINS_WEDGE_LEFT,
  DOLPHINS_WEDGE_RIGHT,
} from './paths';
import { seatedCrownStripe } from '../../core/shared';
import { LEFT_LEG_EDGE, LEG_EDGE_INSET } from '../../core/pants-spec';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

// The crown stripe every kit wears: a centre band between two thin edge stripes, with the shell
// showing in the narrow gaps between them.
const crownStripe = (edge: string, shell: string, centre: string, centreWeight: number) =>
  seatedCrownStripe([
    { id: 'dolphins-crown-edge-top', fill: edge, weight: 2 },
    { id: 'dolphins-crown-gap-top', fill: shell, weight: 1 },
    { id: 'dolphins-crown-centre', fill: centre, weight: centreWeight },
    { id: 'dolphins-crown-gap-bottom', fill: shell, weight: 1 },
    { id: 'dolphins-crown-edge-bottom', fill: edge, weight: 2 },
  ]);

const sunburstDecal = (shell: string) =>
  placed([
    ...crownStripe('orange', shell, 'teal', 7),
    decalLayer('dolphins-decal-ring', DOLPHINS_DECAL_SUNBURST_PATH, 'orange'),
    decalLayer('dolphins-decal-dolphin', DOLPHINS_DECAL_DOLPHIN_PATH, 'teal'),
    decalLayer('dolphins-decal-navy', DOLPHINS_DECAL_NAVY_PATH, 'navy'),
  ]);

const decalLayer = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
});

// Orange-teal-orange crown stripe and sunburst, the teal dolphin over it, and the navy shading on
// the dolphin; the white shell and the navy shell differ only in the gaps of the stripe.
export const DOLPHINS_SUNBURST_DECAL = sunburstDecal('white');
export const DOLPHINS_NAVY_SUNBURST_DECAL = sunburstDecal('navy');

// Teal-orange-teal crown stripe and the teal dolphin breaking through a solid orange ring.
export const DOLPHINS_THROWBACK_DECAL = placed([
  ...crownStripe('teal', 'white', 'orange', 3),
  decalLayer('dolphins-decal-ring', DOLPHINS_TB_DECAL_RING_PATH, 'orange'),
  decalLayer('dolphins-decal-dolphin', DOLPHINS_TB_DECAL_DOLPHIN_PATH, 'teal'),
]);

// The five-band sleeve set (white over orange), above a teal band at the sleeve hem.
const sleeveBands = (): PartLayer[] => {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', DOLPHINS_SLEEVE_X_LEFT],
    ['sleeve-right', DOLPHINS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < DOLPHINS_TB_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = DOLPHINS_TB_STRIPE_BOUNDS[i];
    const bottom = DOLPHINS_TB_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      out.push({
        id: `dolphins-sleeve-band-${i}-${surface === 'sleeve-left' ? 'left' : 'right'}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? 'white' : 'orange',
      });
    }
  }
  return out;
};
export const DOLPHINS_THROWBACK_SLEEVE_BANDS = placed(sleeveBands());

// The aqua lower-sleeve band crossed by the thinner orange stripe.
export const DOLPHINS_RIVALRIES_TRIM = placed([
  {
    id: 'dolphins-wedge-left',
    surface: 'sleeve-left',
    d: DOLPHINS_WEDGE_LEFT,
    clip: true,
    kind: 'fill',
    fill: 'teal',
  },
  {
    id: 'dolphins-wedge-right',
    surface: 'sleeve-right',
    d: DOLPHINS_WEDGE_RIGHT,
    clip: true,
    kind: 'fill',
    fill: 'teal',
  },
  {
    id: 'dolphins-slash-left',
    surface: 'sleeve-left',
    d: DOLPHINS_SLASH_LEFT,
    clip: true,
    kind: 'fill',
    fill: 'orange',
  },
  {
    id: 'dolphins-slash-right',
    surface: 'sleeve-right',
    d: DOLPHINS_SLASH_RIGHT,
    clip: true,
    kind: 'fill',
    fill: 'orange',
  },
]);

// The Rivalries side-seam fin on the navy pants: a teal band along the leg's outer edge that
// tapers to a point on the upper thigh, split near its inner edge by a thin orange line that
// starts lower.
const FIN_TIP_Y = 860;
const FIN_FULL_Y = 960;
const FIN_FULL_WIDTH = 22;
const FIN_HEM_WIDTH = 28;
const FIN_LINE_TIP_Y = 930;
const FIN_LINE = [0.55, 0.7];
const PANTS_HEM_Y = LEFT_LEG_EDGE[LEFT_LEG_EDGE.length - 1][1];

const finWidth = (y: number) =>
  y <= FIN_TIP_Y
    ? 0
    : y <= FIN_FULL_Y
      ? (FIN_FULL_WIDTH * (y - FIN_TIP_Y)) / (FIN_FULL_Y - FIN_TIP_Y)
      : FIN_FULL_WIDTH +
        ((FIN_HEM_WIDTH - FIN_FULL_WIDTH) * (y - FIN_FULL_Y)) / (PANTS_HEM_Y - FIN_FULL_Y);

const edgeX = (y: number): number => {
  for (let i = 1; i < LEFT_LEG_EDGE.length; i += 1) {
    const [x0, y0] = LEFT_LEG_EDGE[i - 1];
    const [x1, y1] = LEFT_LEG_EDGE[i];
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return LEFT_LEG_EDGE[LEFT_LEG_EDGE.length - 1][0];
};

// Samples from `top` to the hem: every edge vertex below it plus the taper's breakpoints.
const finYs = (top: number) =>
  [top, FIN_FULL_Y, ...LEFT_LEG_EDGE.map(([, y]) => y), PANTS_HEM_Y]
    .filter((y, i, all) => y >= top && y <= PANTS_HEM_Y && all.indexOf(y) === i)
    .sort((a, b) => a - b);

const round = (v: number) => Math.round(v * 10) / 10;

// The region between fractions `from` and `to` of the fin's width, from `top` down to the hem.
const finBand = (side: 'left' | 'right', top: number, from: number, to: number) => {
  const ys = finYs(top);
  const x = (y: number, t: number) => {
    const left = edgeX(y) + LEG_EDGE_INSET + finWidth(y) * t;
    return round(side === 'left' ? left : 588 - left);
  };
  const outer = ys.map((y) => [x(y, from), y]);
  const inner = ys
    .slice()
    .reverse()
    .map((y) => [x(y, to), y]);
  return (
    [...outer, ...inner].map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px},${py}`).join(' ') + ' Z'
  );
};

const finLayers = (side: 'left' | 'right'): PartLayer[] => [
  {
    id: `dolphins-rivalries-fin-${side}`,
    surface: side === 'left' ? 'leg-left' : 'leg-right',
    d: finBand(side, FIN_TIP_Y, 0, 1),
    clip: true,
    kind: 'fill',
    fill: 'teal',
  },
  {
    id: `dolphins-rivalries-fin-line-${side}`,
    surface: side === 'left' ? 'leg-left' : 'leg-right',
    d: finBand(side, FIN_LINE_TIP_Y, FIN_LINE[0], FIN_LINE[1]),
    clip: true,
    kind: 'fill',
    fill: 'orange',
  },
];

export const DOLPHINS_RIVALRIES_PANTS_FIN = placed([...finLayers('left'), ...finLayers('right')]);
