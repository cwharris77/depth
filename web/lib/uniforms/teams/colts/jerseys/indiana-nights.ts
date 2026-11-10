import type { CompleteJerseySpec } from '../../core/complete';
import { COLTS_CHEST_C, coltsCollarLogo } from '../marks/construction';
import { COLTS_NUMBER_THREE } from '../marks/numbers';

// The home jersey's two white shoulder stripes on a body drawn flat in the home blue, with a black
// collar and sleeve cuffs, white numerals outlined in black, the white C patch over the heart and
// the white C inside the neck.
export const COLTS_JERSEY_INDIANA_NIGHTS: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'white', size: 'l' },
    ],
    gap: 'broad',
  },
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 's' },
  sleeveNumber: { fill: 'white', outline: 'black' },
  number: {
    height: 195,
    fill: 'white',
    outline: 'black',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: COLTS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: COLTS_CHEST_C },
    { paint: 'over', mark: coltsCollarLogo('white') },
  ],
};
