import type { CompleteJerseySpec } from '../../core/complete';

// Rivalries: the heritage green body with black collar and sleeve stripes and white numerals
// carrying a thin white offset; no shoulder numeral.
export const JETS_JERSEY_RIV: CompleteJerseySpec = {
  body: 'rivalGreen',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: {
    bands: [
      { color: 'black', size: 'l' },
      { color: 'black', size: 'l' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
