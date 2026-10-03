import type { CompleteJerseySpec } from '../../core/complete';

// White body (away and Winter Warning) with a green and gold collar band and a green, gold,
// green sleeve set. Shoulder and chest numerals are green.
export const PACKERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'green',
    trim: 'gold',
    inside: 'body',
    lining: 'none',
    backBar: 'green',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'green', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'green', size: 'm' },
      { color: 'gold', size: 'm' },
      { color: 'green', size: 'm' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'green', outline: 'green', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [],
};
