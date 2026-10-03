import type { CompleteJerseySpec } from '../../core/complete';

// Away: white body with no sleeve trim, teal numerals keylined orange.
export const DOLPHINS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'teal', outline: 'orange' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'teal', outline: 'orange', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
