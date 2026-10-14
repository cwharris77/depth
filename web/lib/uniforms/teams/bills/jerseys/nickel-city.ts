import type { CompleteJerseySpec } from '../../core/complete';
import { BILLS_NUMBER_THREE } from '../marks/numbers';

// Gray body with a royal collar band and four dark-gray stripes on each sleeve; royal numerals
// outlined in white, then red.
export const BILLS_JERSEY_NICKEL_CITY: CompleteJerseySpec = {
  body: 'nickel',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'navy',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'navy', outline: 'red' },
  sleeveStripes: {
    bands: [
      { color: 'nickelDark', size: 's' },
      { color: 'nickelDark', size: 's' },
      { color: 'nickelDark', size: 's' },
      { color: 'nickelDark', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'navy',
    outline: 'white',
    outlineWeight: 'thin',
    outerOutline: 'red',
    texture: 'mesh',
    glyphPath: BILLS_NUMBER_THREE,
  },
  marks: [],
};
