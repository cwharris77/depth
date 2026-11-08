import { placed, type PlacedMark } from '../../core/marks';
import { LEFT_LEG_EDGE, LEG_EDGE_INSET } from '../../core/pants-spec';
import { seatedCrownStripe } from '../../core/shared';
import { RAVENS_HELMET_DECAL } from './construction';
import { RAVENS_2026_WORDMARK, BALTIMORE_2026_WORDMARK } from './wordmarks-2026';

// Two crown stripes with the shell showing between them; from the side the far stripe sits above
// the near one.
const crownStripes = (stripe: string, shell: string) =>
  seatedCrownStripe([
    { id: 'ravens-2026-crown-far', fill: stripe, weight: 3 },
    { id: 'ravens-2026-crown-gap', fill: shell, weight: 2 },
    { id: 'ravens-2026-crown-near', fill: stripe, weight: 3 },
  ]);

export const RAVENS_2026_HELMET = placed([
  ...RAVENS_HELMET_DECAL.layers,
  ...crownStripes('purple', 'black'),
]);

// The purple shell with gold stripes.
export const RAVENS_PURPLE_RISING_HELMET = placed([
  ...RAVENS_HELMET_DECAL.layers,
  ...crownStripes('gold', 'purple'),
]);

// Four feathers down each side of the collar band, each broad at the band's outer edge and
// tapering to a point on its inner edge. They stop short of the mesh panels beside the point.
const LEFT_FEATHERS =
  'M206,384 Q222,394 229,413 L205,396 Z M204,400 Q226,408 238,424 L205,412 Z M207,418 Q234,422 253,436 L213,430 Z M217,435 Q248,436 272,448 L227,444.5 Z';
const RIGHT_FEATHERS = LEFT_FEATHERS.replace(
  /(-?\d+(?:\.\d+)?),/g,
  (_, x) => `${588 - Number(x)},`
);

export function ravensCollarWings(color: string): PlacedMark {
  return placed(
    [LEFT_FEATHERS, RIGHT_FEATHERS].map((d, i) => ({
      id: `ravens-2026-wing-${i ? 'right' : 'left'}`,
      surface: 'collar' as const,
      kind: 'fill' as const,
      fill: color,
      clip: true,
      d,
    }))
  );
}

export const RAVENS_2026_HOME_WORDMARK = placed([
  {
    id: 'ravens-2026-home-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'white',
    d: RAVENS_2026_WORDMARK,
    clip: true,
  },
]);
export const RAVENS_PURPLE_RISING_WORDMARK = placed([
  {
    id: 'ravens-purple-rising-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'gold',
    d: RAVENS_2026_WORDMARK,
    clip: true,
  },
]);
export const RAVENS_2026_AWAY_WORDMARK = placed([
  {
    id: 'ravens-2026-away-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'black',
    d: BALTIMORE_2026_WORDMARK,
    clip: true,
  },
]);

// The talon down the outer edge of each leg: full width from the waist, cut diagonally to a point
// at the hem, with a thin piping along its outer edge.
const TALON_WIDTH = 20;
const TALON_CUT_Y = 1077;
const TALON_PIPING = 0.15;
const HEM_Y = LEFT_LEG_EDGE[LEFT_LEG_EDGE.length - 1][1];

const edgeX = (y: number): number => {
  for (let i = 1; i < LEFT_LEG_EDGE.length; i += 1) {
    const [x0, y0] = LEFT_LEG_EDGE[i - 1];
    const [x1, y1] = LEFT_LEG_EDGE[i];
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return LEFT_LEG_EDGE[LEFT_LEG_EDGE.length - 1][0];
};

const talonWidth = (y: number) =>
  y <= TALON_CUT_Y ? TALON_WIDTH : (TALON_WIDTH * (HEM_Y - y)) / (HEM_Y - TALON_CUT_Y);

const round = (v: number) => Math.round(v * 10) / 10;

// The region between fractions `from` and `to` of the talon's width, waist to hem.
function talonBand(side: 'left' | 'right', from: number, to: number): string {
  const ys = [...LEFT_LEG_EDGE.map(([, y]) => y), TALON_CUT_Y]
    .filter((y, i, all) => all.indexOf(y) === i)
    .sort((a, b) => a - b);
  const x = (y: number, t: number) => {
    const left = edgeX(y) + LEG_EDGE_INSET + talonWidth(y) * t;
    return round(side === 'left' ? left : 588 - left);
  };
  const points = [
    ...ys.map((y) => [x(y, from), y]),
    ...ys
      .slice()
      .reverse()
      .map((y) => [x(y, to), y]),
  ];
  return points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px},${py}`).join(' ') + ' Z';
}

export function ravens2026Talons(talon: string, piping: string): PlacedMark {
  return placed(
    (['left', 'right'] as const).flatMap((side) => [
      {
        id: `ravens-2026-talon-${side}`,
        surface: side === 'left' ? ('leg-left' as const) : ('leg-right' as const),
        kind: 'fill' as const,
        fill: talon,
        clip: true,
        d: talonBand(side, 0, 1),
      },
      {
        id: `ravens-2026-talon-piping-${side}`,
        surface: side === 'left' ? ('leg-left' as const) : ('leg-right' as const),
        kind: 'fill' as const,
        fill: piping,
        clip: true,
        d: talonBand(side, 0, TALON_PIPING),
      },
    ])
  );
}
