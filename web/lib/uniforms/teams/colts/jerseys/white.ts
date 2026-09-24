import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = expandJersey('colts-white', {
  body: 'white',
  collar: { style: 'inset-v', color: 'white', outline: true },
  shoulderStripes: {
    bands: [
      { color: 'navy', size: 'l' },
      { color: 'navy', size: 'l' },
    ],
    gap: 'broad',
  },
  sleeveNumber: { fill: 'navy' },
  number: { fill: 'navy', outline: 'white', outlineWeight: 'none' },
});
