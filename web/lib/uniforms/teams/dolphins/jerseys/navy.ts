import { DOLPHINS_RIVALRIES_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';
import { DOLPHINS_RIVALRIES_TRIM } from '../marks/construction';

// Rivalries: navy body, an aqua lower-sleeve band crossed by orange and an orange-lined
// keylined collar, teal numerals.
export const DOLPHINS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'orange',
    backBar: 'orange',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'teal', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'teal',
    outline: 'teal',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: DOLPHINS_RIVALRIES_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: DOLPHINS_RIVALRIES_TRIM }],
};
