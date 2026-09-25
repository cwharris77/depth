import type { CompleteJerseySpec } from '../../core/complete';

// White-piped navy stripes, a white V collar with a navy inset, and white numerals with a heavy
// navy outline.
export const BEARS_JERSEY_ORANGE: CompleteJerseySpec = {
  body: 'orange',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'navy',
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
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'white',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'navy', outlineWeight: 'heavy', texture: 'mesh' },
  marks: [],
};
