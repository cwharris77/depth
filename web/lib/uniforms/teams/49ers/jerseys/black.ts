import type { CompleteJerseySpec } from '../../core/complete';

// Red sleeve stripes and shoulder numerals; red body numerals with a gold outline.
export const NINERS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'black',
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
  number: { fill: 'red', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
