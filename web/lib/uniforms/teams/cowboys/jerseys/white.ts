import type { CompleteJerseySpec } from '../../core/complete';
import { COWBOYS_NUMBER_THREE } from '../marks/numbers';

// White body, a keylined white V collar, two dark-edged blue sleeve stripes, blue shoulder and
// chest numerals.
export const COWBOYS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'navy', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 'm' },
      { color: 'navy', size: 'm' },
    ],
    gap: 'narrow',
    edge: 'deepNavy',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 180,
    fill: 'navy',
    outline: 'navy',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: COWBOYS_NUMBER_THREE,
  },
  marks: [],
};
