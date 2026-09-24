import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// White-piped navy stripes, a white V collar with a navy inset, and white numerals with a heavy
// navy outline.
export const JERSEY_ORANGE: UniformPart = expandJersey('bears-orange', {
  body: 'orange',
  collar: { style: 'inset-v', color: 'white', trim: 'navy' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'white',
  },
  number: { fill: 'white', outline: 'navy', outlineWeight: 'heavy' },
});
