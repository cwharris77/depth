// Washington's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  COMMANDERS_BOUNDS,
  COMMANDERS_DECAL_PATH,
  COMMANDERS_SLEEVE_X_LEFT,
  COMMANDERS_SLEEVE_X_RIGHT,
} from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

// The broad cap band split by a thinner line through its middle, on both sleeves.
function sleeveBand(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', COMMANDERS_SLEEVE_X_LEFT],
    ['sleeve-right', COMMANDERS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < COMMANDERS_BOUNDS.length - 1; i += 1) {
    const top = COMMANDERS_BOUNDS[i];
    const bottom = COMMANDERS_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `commanders-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? line : band,
      });
    }
  }
  return out;
}

// Gold band around a white line.
export const COMMANDERS_SLEEVE_BAND_GOLD = placed(sleeveBand('gold', 'white'));

// Burgundy band around a gold line.
export const COMMANDERS_SLEEVE_BAND_BURGUNDY = placed(sleeveBand('burgundy', 'gold'));

// The gold "W" on the helmet shell.
export const COMMANDERS_W_DECAL = placed([
  {
    id: 'commanders-decal',
    surface: 'helmet',
    d: COMMANDERS_DECAL_PATH,
    clip: true,
    kind: 'fill',
    fill: 'gold',
  },
]);
