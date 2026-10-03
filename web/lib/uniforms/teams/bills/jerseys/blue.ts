import type { CompleteJerseySpec } from '../../core/complete';

// Royal body. The collar band is white with a red lining on its inner half and a red bar across
// the back of the neck; the sleeves carry two red-piped white stripes and a white shoulder numeral.
export const BILLS_JERSEY_BLUE: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'body',
    lining: 'red',
    backBar: 'red',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'red' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 's' },
      { color: 'white', size: 's' },
    ],
    gap: 'wide',
    edge: 'red',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
