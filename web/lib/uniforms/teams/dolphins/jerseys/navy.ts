import type { CompleteJerseySpec } from '../../core/complete';
import { DOLPHINS_RIVALRIES_TRIM } from '../marks/construction';

// Rivalries: navy body, a teal wedge with an orange slash on each sleeve and an orange V at the
// neck, teal numerals.
export const DOLPHINS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'teal', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'teal', outline: 'teal', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: DOLPHINS_RIVALRIES_TRIM }],
};
