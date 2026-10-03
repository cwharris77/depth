import type { CompleteJerseySpec } from '../../core/complete';

// Teal body with a black V collar band keylined grey, a teal back bar, white shoulder numerals, a
// black sleeve hem band and plain white numerals.
export const JAGUARS_JERSEY_TEAL: CompleteJerseySpec = {
  body: 'teal',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'teal',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'l' },
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'teal', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
