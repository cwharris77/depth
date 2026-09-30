import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Away: the home construction in reverse — white body with the collar, shoulder numeral, sleeve
// stripes and numerals all green.
export const JERSEY_WHITE: UniformPart = expandJersey('jets-white', {
  body: 'white',
  collar: { style: 'inset-v', color: 'green' },
  shoulderNumber: { fill: 'green' },
  sleeveStripes: {
    bands: [
      { color: 'green', size: 'l' },
      { color: 'green', size: 'l' },
    ],
    gap: 'broad',
  },
  number: { fill: 'green', outline: 'white', outlineWeight: 'none' },
});
