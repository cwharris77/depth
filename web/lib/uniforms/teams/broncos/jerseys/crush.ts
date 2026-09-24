import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

export const JERSEY_CRUSH: UniformPart = expandJersey('broncos-crush', {
  body: 'crushOrange',
  collar: { style: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'royal', size: 'm' },
      { color: 'white', size: 's' },
      { color: 'royal', size: 'm' },
    ],
    gap: 'narrow',
  },
  number: { fill: 'white', outline: 'royal', outlineWeight: 'thin' },
});
