import type { CompleteJerseySpec } from '../../core/complete';
import { chargersNavySleeveBolts } from '../marks/construction';
import { CHARGERS_NUMBER_THREE } from '../marks/numbers';
import { SUPER_CHARGERS_NECK_INSCRIPTION } from '../marks/neck-inscriptions';

// A white sleeve bolt and numeral inside navy and gold outlines.
export const CHARGERS_JERSEY_NAVY: CompleteJerseySpec = {
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
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 200,
    fill: 'white',
    outline: 'navy',
    outlineWeight: 'thin',
    outerOutline: 'gold',
    outerOutlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: CHARGERS_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: chargersNavySleeveBolts() },
    { paint: 'over', mark: SUPER_CHARGERS_NECK_INSCRIPTION },
  ],
};
