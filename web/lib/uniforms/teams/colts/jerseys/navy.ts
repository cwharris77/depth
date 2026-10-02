import type { CompleteJerseySpec } from '../../core/complete';

// White shoulder stripes and white numerals with no outline.
export const COLTS_JERSEY_NAVY: CompleteJerseySpec = {
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
  shoulderStripes: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'white', size: 'l' },
    ],
    gap: 'broad',
  },
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'white' },
  number: { fill: 'white', outline: 'navy', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
