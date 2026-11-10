import type { CompleteJerseySpec } from '../../core/complete';
import { coltsCollarLogo } from '../marks/construction';
import { COLTS_NUMBER_THREE } from '../marks/numbers';

// Navy shoulder stripes, navy numerals with no outline and the navy C inside the neck.
export const COLTS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderStripes: {
    bands: [
      { color: 'navy', size: 'l' },
      { color: 'navy', size: 'l' },
    ],
    gap: 'broad',
  },
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'navy' },
  number: {
    height: 195,
    fill: 'navy',
    outline: 'white',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: COLTS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: coltsCollarLogo('navy') }],
};
