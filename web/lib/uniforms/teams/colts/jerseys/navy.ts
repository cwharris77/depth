import type { CompleteJerseySpec } from '../../core/complete';
import { coltsCollarLogo } from '../marks/construction';
import { COLTS_NUMBER_THREE } from '../marks/numbers';

// White shoulder stripes, white numerals with no outline and the white C inside the neck.
export const COLTS_JERSEY_NAVY: CompleteJerseySpec = {
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
  shoulderStripes: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'white', size: 'l' },
    ],
    gap: 'broad',
  },
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'white' },
  number: {
    height: 195,
    fill: 'white',
    outline: 'navy',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: COLTS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: coltsCollarLogo('white') }],
};
