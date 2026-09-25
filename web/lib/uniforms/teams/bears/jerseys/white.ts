import type { CompleteJerseySpec } from '../../core/complete';

// Navy-orange-navy sleeve stripes and navy numerals with a thin orange outline.
export const BEARS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'navy', outline: 'orange' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'navy', outline: 'orange', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
