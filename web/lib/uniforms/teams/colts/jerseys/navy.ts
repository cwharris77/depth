import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

export const JERSEY_NAVY: UniformPart = expandJersey('colts-navy', {
  body: 'navy',
  collar: { style: 'inset-v', color: 'navy', outline: true },
  shoulderStripes: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'white', size: 'l' },
    ],
    gap: 'broad',
  },
  number: { fill: 'white', outline: 'navy', outlineWeight: 'none' },
});
