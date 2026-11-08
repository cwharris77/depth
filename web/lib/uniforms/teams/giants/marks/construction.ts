// New York's own construction layers, bound to palette keys: the helmet decals, the chest
// monogram and the cuff stripes.
import { GIANTS_DECAL_MODERN_PATHS } from './decal';
import { GIANTS_WORDMARK_LETTERS_PATH, GIANTS_WORDMARK_UNDERLINE_PATH } from './wordmark';
import { boundsOf, placeMark, placed, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { seatedCrownStripe } from '../../core/shared';

const crownStripe = (id: string): PartLayer[] =>
  seatedCrownStripe([{ id, fill: 'red', weight: 1 }]);

// The red centre stripe under the white lowercase monogram.
export const GIANTS_MONOGRAM_DECAL = placed([
  ...crownStripe('giants-helmet-crown-stripe'),
  {
    id: 'giants-decal-monogram',
    surface: 'helmet',
    d: GIANTS_DECAL_MODERN_PATHS.map((path) => path.d).join(' '),
    clip: true,
    kind: 'fill',
    fill: 'white',
  },
]);

// The red centre stripe under the white underlined wordmark. The letters carry the A's counter
// as a subpath, so they paint even-odd.
export const GIANTS_WORDMARK_DECAL = placed([
  ...crownStripe('giants-wordmark-helmet-crown-stripe'),
  {
    id: 'giants-decal-wordmark-underline',
    surface: 'helmet',
    d: GIANTS_WORDMARK_UNDERLINE_PATH,
    clip: true,
    kind: 'fill',
    fill: 'white',
  },
  {
    id: 'giants-decal-wordmark-letters',
    surface: 'helmet',
    d: GIANTS_WORDMARK_LETTERS_PATH,
    clip: true,
    kind: 'fill',
    fill: 'white',
    fillRule: 'evenodd',
  },
]);

// The helmet monogram, scaled to the small logo between the collar point and the numeral.
export function giantsChestMonogram(color: string): PlacedMark {
  return placed(
    placeMark(
      `giants-chest-monogram-${color}`,
      {
        box: boundsOf(GIANTS_DECAL_MODERN_PATHS.map(({ d }) => d).join(' ')),
        paths: GIANTS_DECAL_MODERN_PATHS.map(({ d }) => ({ slot: 'monogram', d })),
      },
      'chest-center',
      { monogram: color }
    )
  );
}

// Three bands running into the sleeve hem (y 589), spanning the full sleeve width, listed from
// the top down with their heights.
const CUFF_SIDES = [
  { surface: 'sleeve-left', side: 'left', x0: 30, x1: 102 },
  { surface: 'sleeve-right', side: 'right', x0: 486, x1: 558 },
] as const;

function cuffStripes(id: string, bands: readonly [string, number][]): PlacedMark {
  const total = bands.reduce((sum, [, height]) => sum + height, 0);
  let top = 589 - total;
  return placed(
    bands.flatMap(([fill, height], i): PartLayer[] => {
      const y0 = top;
      top += height;
      return CUFF_SIDES.map(({ surface, side, x0, x1 }) => ({
        id: `${id}-${i}-${side}`,
        surface,
        d: `M${x0},${y0} H${x1} V${top} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill,
      }));
    })
  );
}

// Red, white, red in equal bands.
export const GIANTS_THROWBACK_CUFF_STRIPES = cuffStripes('giants-cuff-stripe', [
  ['red', 10],
  ['white', 10],
  ['red', 10],
]);

// A broad royal band, a narrow red band, and a royal band at the hem.
export const GIANTS_VINTAGE_WHITE_CUFF_STRIPES = cuffStripes('giants-vintage-white-cuff-stripe', [
  ['royal', 10],
  ['red', 5],
  ['royal', 7],
]);
