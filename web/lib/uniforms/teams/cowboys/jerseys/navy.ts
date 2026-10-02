import type { CompleteJerseySpec } from '../../core/complete';

// Navy body, a white-over-silver neck band and rounded collar, white numerals.
export const COWBOYS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'silver',
    trim: 'none',
    inside: 'body',
    lining: 'white',
    backBar: 'white',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: { bands: [{ color: 'silver', size: 'm' }], gap: 'none', edge: 'none' },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
