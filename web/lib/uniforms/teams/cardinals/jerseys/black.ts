import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_BLACK_JERSEY_ART } from '../marks/jersey-art';

// Black body with two cardinal sleeve bands around a white label block and cardinal numerals
// keylined in white. The feathered collar is a body-coloured cut drawn as art with a grey keyline.
export const CARDINALS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'cardinal', outline: 'white', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: CARDINALS_BLACK_JERSEY_ART }],
};
