import type { CompleteJerseySpec } from '../../core/complete';
import { patriotsShoulderBands } from '../marks/construction';

// Royal body with a same-colour keylined V collar, white-navy-white shoulder bands and white numerals outlined in navy.
export const PATRIOTS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'rivalNavy',
  collar: {
    style: 'inset-v',
    color: 'rivalNavy',
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
  number: { fill: 'white', outline: 'navy', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: patriotsShoulderBands('white', 'navy') }],
};
