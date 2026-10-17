import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_NUMBER_THREE } from '../marks/numbers';
import { CARDINALS_BLACK_JERSEY_ART } from '../marks/jersey-art';

// Black body with two cardinal sleeve bands around a white label block and cardinal numerals
// keylined in white.
export const CARDINALS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'black',
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
    outline: 'white',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: CARDINALS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: CARDINALS_BLACK_JERSEY_ART }],
};
