// New York's own construction layers, bound to palette keys: the monogram decal and the
// throwback's cuff stripes.
import { GIANTS_DECAL_MODERN_PATHS } from './decal';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// The lowercase monogram on the shell, in white.
export const GIANTS_MONOGRAM_DECAL = placed([
  {
    id: 'giants-decal-monogram',
    surface: 'helmet',
    d: GIANTS_DECAL_MODERN_PATHS.map((path) => path.d).join(' '),
    clip: true,
    kind: 'fill',
    fill: 'white',
  },
]);

// Red, white, red bands running into the sleeve hem (y 589), spanning the full sleeve width.
const CUFF_BANDS: [number, number, string][] = [
  [559, 569, 'red'],
  [569, 579, 'white'],
  [579, 589, 'red'],
];
const CUFF_SIDES = [
  { surface: 'sleeve-left', side: 'left', x0: 30, x1: 102 },
  { surface: 'sleeve-right', side: 'right', x0: 486, x1: 558 },
] as const;

export const GIANTS_THROWBACK_CUFF_STRIPES = placed(
  CUFF_BANDS.flatMap(([top, bottom, fill], i): PartLayer[] =>
    CUFF_SIDES.map(({ surface, side, x0, x1 }) => ({
      id: `giants-cuff-stripe-${i}-${side}`,
      surface,
      d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
      clip: true,
      kind: 'fill',
      fill,
    }))
  )
);
