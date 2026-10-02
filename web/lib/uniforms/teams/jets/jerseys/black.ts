import type { CompleteJerseySpec } from '../../core/complete';

// Black alternate: black body with green trim throughout, a white shoulder numeral, and white
// chest numerals carrying a thin green offset.
export const JETS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'green',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'green', size: 'l' },
      { color: 'green', size: 'l' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'green', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
