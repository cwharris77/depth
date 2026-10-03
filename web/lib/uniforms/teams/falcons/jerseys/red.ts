import type { CompleteJerseySpec } from '../../core/complete';
import { falconsSideStripes } from '../marks/construction';

// Red body with a red V collar keylined grey, white side piping, and white numerals keylined black.
export const FALCONS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'red',
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
  number: { fill: 'white', outline: 'black', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: falconsSideStripes('white') }],
};
