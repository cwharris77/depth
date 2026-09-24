import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

export const JERSEY_NAVY: UniformPart = expandJersey('bears-navy', {
  body: 'navy',
  collar: { style: 'inset-v', color: 'navy', outline: true },
  shoulderBar: { color: 'white' },
  sleeveStripes: {
    bands: [
      { color: 'orange', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'orange', size: 's' },
    ],
    gap: 'wide',
    edge: 'white',
  },
  number: { fill: 'white', outline: 'orange', outlineWeight: 'thin' },
});
