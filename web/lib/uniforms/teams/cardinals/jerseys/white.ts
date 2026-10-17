import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_NUMBER_THREE } from '../marks/numbers';
import { CARDINALS_AWAY_JERSEY_ART } from '../marks/jersey-art';

// White body with two cardinal sleeve bands around a white label block and cardinal numerals
// keylined in black.
export const CARDINALS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
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
    height: 175,
    fill: 'cardinal',
    outline: 'numberKeyline',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: CARDINALS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: CARDINALS_AWAY_JERSEY_ART }],
};
