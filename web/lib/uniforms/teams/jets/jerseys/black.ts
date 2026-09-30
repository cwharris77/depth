import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Black alternate: black body with green trim throughout, a white shoulder numeral, and white
// chest numerals carrying a thin green offset.
export const JERSEY_BLACK: UniformPart = expandJersey('jets-black', {
  body: 'black',
  collar: { style: 'inset-v', color: 'green' },
  shoulderNumber: { fill: 'white' },
  sleeveStripes: {
    bands: [
      { color: 'green', size: 'l' },
      { color: 'green', size: 'l' },
    ],
    gap: 'broad',
  },
  number: { fill: 'white', outline: 'green', outlineWeight: 'thin' },
});
