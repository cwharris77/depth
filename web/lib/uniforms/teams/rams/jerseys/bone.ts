import type { CompleteJerseySpec } from '../../core/complete';
import { RAMS_NUMBER_THREE } from '../marks/numbers';
import { RAMS_CHEST_BONE } from '../marks/labels';

// Bone body with a body-coloured collar and plain sleeves carrying a royal TV number; flat royal numerals.
export const RAMS_JERSEY_BONE: CompleteJerseySpec = {
  body: 'bone',
  collar: {
    style: 'inset-v',
    color: 'bone',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'royal' },
  number: {
    fill: 'royal',
    outline: 'gold',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: RAMS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: RAMS_CHEST_BONE }],
};
