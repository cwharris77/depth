import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// White body. The collar band reverses the royal jersey's: red on its outer half, royal lining on
// the inner half, red across the back of the neck. Sleeve stripes and shoulder numeral go royal.
export const JERSEY_WHITE: UniformPart = expandJersey('bills-white', {
  body: 'white',
  collar: { style: 'inset-v', color: 'red', lining: 'navy', backBar: 'red', inside: 'white' },
  shoulderNumber: { fill: 'navy', outline: 'red' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'red',
  },
  number: { fill: 'navy', outline: 'red', outlineWeight: 'regular' },
});
