import type { CompleteJerseySpec } from '../../core/complete';

// Home: teal body, a keylined teal collar, no sleeve trim, white numerals keylined orange.
export const DOLPHINS_JERSEY_TEAL: CompleteJerseySpec = {
  body: 'teal',
  collar: {
    style: 'inset-v',
    color: 'teal',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'orange' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
