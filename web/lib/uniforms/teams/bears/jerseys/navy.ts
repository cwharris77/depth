import type { CompleteJerseySpec } from '../../core/complete';

// White-piped orange sleeve stripes and white numerals with a thin orange outline.
export const BEARS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'orange' },
  sleeveStripes: {
    bands: [
      { color: 'orange', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'orange', size: 's' },
    ],
    gap: 'wide',
    edge: 'white',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
