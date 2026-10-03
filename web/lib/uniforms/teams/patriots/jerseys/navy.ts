import type { CompleteJerseySpec } from '../../core/complete';
import { patriotsShoulderBands } from '../marks/construction';

// Navy body with a same-colour keylined V collar, red-white-red shoulder bands and white numerals outlined in red.
export const PATRIOTS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: patriotsShoulderBands('red', 'white') }],
};
