import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Royal body. The collar band is white with a red lining on its inner half and a red bar across
// the back of the neck; the sleeves carry two red-piped white stripes and a white shoulder numeral.
export const JERSEY_BLUE: UniformPart = expandJersey('bills-blue', {
  body: 'navy',
  collar: { style: 'inset-v', color: 'white', lining: 'red', backBar: 'red' },
  shoulderNumber: { fill: 'white', outline: 'red' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 's' },
      { color: 'white', size: 's' },
    ],
    gap: 'wide',
    edge: 'red',
  },
  number: { fill: 'white', outline: 'red', outlineWeight: 'regular' },
});
