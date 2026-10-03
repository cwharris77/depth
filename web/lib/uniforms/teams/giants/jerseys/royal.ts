import type { CompleteJerseySpec } from '../../core/complete';

// Royal body with a royal V collar keylined grey, white shoulder numerals, no sleeve stripes,
// and plain white numerals.
export const GIANTS_JERSEY_ROYAL: CompleteJerseySpec = {
  body: 'royal',
  collar: {
    style: 'inset-v',
    color: 'royal',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
