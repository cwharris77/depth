import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_AWAY_JERSEY_ART } from '../marks/jersey-art';

// White body with two cardinal sleeve bands around a white label block and cardinal numerals
// keylined in black. The feathered collar is a body-coloured cut drawn as art with a grey keyline.
export const CARDINALS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'cardinal', outline: 'numberKeyline', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: CARDINALS_AWAY_JERSEY_ART }],
};
