// Detroit's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import { LIONS_DECAL_PATHS } from './decal';
import { LIONS_BAND_BOUNDS, LIONS_SLEEVE_X_LEFT, LIONS_SLEEVE_X_RIGHT } from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// The leaping lion on the silver shell: a white keyline with the blue body over it.
export const LIONS_HELMET_DECAL = placed(
  LIONS_DECAL_PATHS.map(({ d, fill }, index): PartLayer => ({
    id: `lions-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

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
