import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Home jersey: brown body, a five-band white-and-orange sleeve stack, a white shoulder numeral and
// plain white chest numerals. The V collar is body-coloured, so it needs the grey keyline to read.
export const JERSEY_BROWN: UniformPart = expandJersey('browns-brown', {
  body: 'brown',
  collar: { style: 'inset-v', color: 'brown', outline: true },
  shoulderNumber: { fill: 'white' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'white', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'white', size: 'm' },
    ],
    gap: 'none',
  },
  number: { fill: 'white', outline: 'brown', outlineWeight: 'none' },
});
