import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Away and 1946 jersey: white body carrying the same five-band sleeve stack with brown in white's
// place, a brown shoulder numeral and plain brown chest numerals.
export const JERSEY_WHITE: UniformPart = expandJersey('browns-white', {
  body: 'white',
  collar: { style: 'inset-v', color: 'white', outline: true },
  shoulderNumber: { fill: 'brown' },
  sleeveStripes: {
    bands: [
      { color: 'brown', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'brown', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'brown', size: 'm' },
    ],
    gap: 'none',
  },
  number: { fill: 'brown', outline: 'white', outlineWeight: 'none' },
});
