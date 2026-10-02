import type { CompleteJerseySpec } from '../../core/complete';

// Red-gold-red sleeve bands, red shoulder numerals and red chest numerals, all ringed gold.
export const CHIEFS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'red', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'red', size: 'm' },
      { color: 'gold', size: 's' },
      { color: 'red', size: 'm' },
    ],
    gap: 'none',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'red', outline: 'gold', outlineWeight: 'heavy', texture: 'mesh' },
  marks: [],
};
