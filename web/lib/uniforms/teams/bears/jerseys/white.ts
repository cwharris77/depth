import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = expandJersey('bears-white', {
  body: 'white',
  collar: { style: 'inset-v', color: 'white', outline: true },
  shoulderNumber: { fill: 'navy', outline: 'orange' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
  },
  number: { fill: 'navy', outline: 'orange', outlineWeight: 'thin' },
});
