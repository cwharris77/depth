import type { CompleteJerseySpec } from '../../core/complete';

// Home: teal body with no sleeve trim, white numerals keylined orange.
export const DOLPHINS_JERSEY_TEAL: CompleteJerseySpec = {
  body: 'teal',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'orange' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
