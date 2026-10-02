import type { CompleteJerseySpec } from '../../core/complete';

// Away: the home construction in reverse — white body with the collar, shoulder numeral, sleeve
// stripes and numerals all green.
export const JETS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
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
  shoulderNumber: { fill: 'green', outline: 'none' },
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
  number: { fill: 'green', outline: 'white', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
