import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Rivalries: the heritage green body with black trim and white numerals. Its construction is the
// one already carried here, restated as a spec.
export const JERSEY_RIV: UniformPart = expandJersey('jets-riv', {
  body: 'rivalGreen',
  collar: { style: 'inset-v', color: 'black' },
  sleeveStripes: {
    bands: [
      { color: 'black', size: 'l' },
      { color: 'black', size: 'l' },
    ],
    gap: 'broad',
  },
  number: { fill: 'white', outline: 'white', outlineWeight: 'thin' },
});
