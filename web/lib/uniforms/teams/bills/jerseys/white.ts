import type { CompleteJerseySpec } from '../../core/complete';
import { billsChestWordmark } from '../marks/jersey-art';
import { BILLS_NUMBER_THREE } from '../marks/numbers';

// White body. A royal collar band with a red lining on its inner half and red across the back of
// the neck; royal sleeve stripes, shoulder numeral and chest wordmark.
export const BILLS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'white',
    lining: 'red',
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
  marks: [{ paint: 'over', mark: billsChestWordmark('navy') }],
};
