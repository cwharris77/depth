import type { CompleteJerseySpec } from '../../core/complete';
import { BILLS_NUMBER_THREE } from '../marks/numbers';

// White body. The collar band reverses the royal jersey's: red on its outer half, royal lining on
// the inner half, red across the back of the neck. Sleeve stripes and shoulder numeral go royal.
export const BILLS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'red',
    trim: 'none',
    inside: 'white',
    lining: 'navy',
    backBar: 'red',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'navy', outline: 'red' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'red',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'navy',
    outline: 'red',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: BILLS_NUMBER_THREE,
  },
  marks: [],
};
