import type { CompleteJerseySpec } from '../../core/complete';

// Home: green body, white inset-V collar, a white shoulder numeral and two white sleeve stripes
// separated by a body-coloured gap. Numerals are flat white with no offset.
export const JETS_JERSEY_GREEN: CompleteJerseySpec = {
  body: 'green',
  collar: {
    style: 'inset-v',
    color: 'white',
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
      { color: 'white', size: 'l' },
      { color: 'white', size: 'l' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'green', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
