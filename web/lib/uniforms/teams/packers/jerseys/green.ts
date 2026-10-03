import type { CompleteJerseySpec } from '../../core/complete';

// Green body with a gold, white and gold collar band and a gold, white, gold sleeve set. Shoulder
// and chest numerals are white.
export const PACKERS_JERSEY_GREEN: CompleteJerseySpec = {
  body: 'green',
  collar: {
    style: 'inset-v',
    color: 'gold',
    trim: 'white',
    inside: 'body',
    lining: 'gold',
    backBar: 'gold',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'gold', size: 'm' },
      { color: 'white', size: 'm' },
      { color: 'gold', size: 'm' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [],
};
