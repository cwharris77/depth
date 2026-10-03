import type { CompleteJerseySpec } from '../../core/complete';

// The 1987 kelly-green jersey: a white rounded collar, no sleeve band, white numerals keylined
// silver.
export const EAGLES_JERSEY_KELLY_ORIGINAL: CompleteJerseySpec = {
  body: 'kelly',
  collar: { style: 'rounded', color: 'white', trim: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'silver', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
