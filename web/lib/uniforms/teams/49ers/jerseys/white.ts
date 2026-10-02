import type { CompleteJerseySpec } from '../../core/complete';

// Red sleeve stripes, shoulder numerals and body numerals on the white body.
export const NINERS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'red', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'red', size: 'm' },
      { color: 'red', size: 'm' },
      { color: 'red', size: 'm' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'red', outline: 'red', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
