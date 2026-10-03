import type { CompleteJerseySpec } from '../../core/complete';
import { patriotsShoulderBands } from '../marks/construction';

// Red body with a same-colour keylined V collar, white-blue-white shoulder bands, white numerals outlined in blue and white sleeve numerals.
export const PATRIOTS_JERSEY_PAT: CompleteJerseySpec = {
  body: 'patRed',
  collar: {
    style: 'inset-v',
    color: 'patRed',
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
  sleeveNumber: { fill: 'white' },
  number: { fill: 'white', outline: 'rivalNavy', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: patriotsShoulderBands('white', 'rivalNavy') }],
};
