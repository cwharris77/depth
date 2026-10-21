import { lionsCrown } from './crown';
// Detroit's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import { LIONS_DECAL_PATHS } from './decal';
import { LIONS_BAND_BOUNDS, LIONS_SLEEVE_X_LEFT, LIONS_SLEEVE_X_RIGHT } from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// The leaping lion on the silver shell: a white keyline with the blue body over it.
export const LIONS_HELMET_DECAL = placed([
  ...LIONS_DECAL_PATHS.map(({ d, fill }, index): PartLayer => ({
    id: `lions-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  })),
]);

export const LIONS_2017_HELMET_DECAL = placed([
  ...lionsCrown('blue', 'silver'),
  ...LIONS_DECAL_PATHS.map(({ d, fill }, index): PartLayer => ({
    id: `lions-2017-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  })),
]);

export const LIONS_BLACK_HELMET_DECAL = placed([
  ...LIONS_DECAL_PATHS.map(({ d }, index): PartLayer => ({
    id: `lions-black-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill: index === 0 ? 'black' : 'silver',
  })),
]);

// Four contiguous sleeve bands on each sleeve, the first and third in `band`, the second and
// fourth in `line`.
function sleeveBands(band: string, line: string) {
  const sides = [
    { surface: 'sleeve-left', side: 'left', x: LIONS_SLEEVE_X_LEFT },
    { surface: 'sleeve-right', side: 'right', x: LIONS_SLEEVE_X_RIGHT },
  ] as const;
  const layers: PartLayer[] = [];
  for (let i = 0; i < LIONS_BAND_BOUNDS.length - 1; i += 1) {
    for (const { surface, side, x } of sides) {
      layers.push({
        id: `lions-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x[0]},${LIONS_BAND_BOUNDS[i]} H${x[1]} V${LIONS_BAND_BOUNDS[i + 1]} H${x[0]} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? band : line,
      });
    }
  }
  return placed(layers);
}

export const LIONS_BANDS_SILVER = sleeveBands('silver', 'white');
export const LIONS_BANDS_BLUE_SILVER = sleeveBands('blue', 'silver');
export const LIONS_BANDS_BLUE_WHITE = sleeveBands('blue', 'white');

// The 2017 sleeve set: a thin blue stripe, a wide blue band carrying the sleeve lettering, and a
// second thin stripe, separated by body-colour gaps.
export const LIONS_GRAY_SLEEVE_BANDS = placed([
  {
    id: 'lions-gray-band-0-left',
    surface: 'sleeve-left',
    kind: 'fill',
    fill: 'blue',
    clip: true,
    d: 'M30,460 H90 V470 H30 Z',
  },
  {
    id: 'lions-gray-band-1-left',
    surface: 'sleeve-left',
    kind: 'fill',
    fill: 'blue',
    clip: true,
    d: 'M30,480 H90 V528 H30 Z',
  },
  {
    id: 'lions-gray-band-2-left',
    surface: 'sleeve-left',
    kind: 'fill',
    fill: 'blue',
    clip: true,
    d: 'M30,538 H90 V548 H30 Z',
  },
  {
    id: 'lions-gray-band-0-right',
    surface: 'sleeve-right',
    kind: 'fill',
    fill: 'blue',
    clip: true,
    d: 'M498,460 H558 V470 H498 Z',
  },
  {
    id: 'lions-gray-band-1-right',
    surface: 'sleeve-right',
    kind: 'fill',
    fill: 'blue',
    clip: true,
    d: 'M498,480 H558 V528 H498 Z',
  },
  {
    id: 'lions-gray-band-2-right',
    surface: 'sleeve-right',
    kind: 'fill',
    fill: 'blue',
    clip: true,
    d: 'M498,538 H558 V548 H498 Z',
  },
]);
