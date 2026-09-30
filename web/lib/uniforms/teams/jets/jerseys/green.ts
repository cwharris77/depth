import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Home: green body, white inset-V collar, a white shoulder numeral and two white sleeve stripes
// separated by a body-coloured gap. Numerals are flat white with no offset.
export const JERSEY_GREEN: UniformPart = expandJersey('jets-green', {
  body: 'green',
  collar: { style: 'inset-v', color: 'white' },
  shoulderNumber: { fill: 'white' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'white', size: 'l' },
    ],
    gap: 'broad',
  },
  number: { fill: 'white', outline: 'green', outlineWeight: 'none' },
});
