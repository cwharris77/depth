import type { CompleteJerseySpec } from '../../core/complete';
import { patriotsShoulderBands } from '../marks/construction';

// White body with a same-colour keylined V collar, red-navy-red shoulder bands and navy numerals outlined in red.
export const PATRIOTS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
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
  number: { fill: 'navy', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: patriotsShoulderBands('red', 'navy') }],
};
