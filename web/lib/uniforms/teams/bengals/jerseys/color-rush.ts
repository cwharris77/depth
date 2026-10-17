import { BENGALS_COLOR_RUSH_CHEST } from '../marks/chest-b';
import { BENGALS_BLOCK_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';
import { BENGALS_COLOR_RUSH_SLEEVES } from '../marks/construction';

// All white with a black collar, black sleeve hems and shoulder numerals, black tiger sleeve caps,
// and plain black numerals.
export const BENGALS_JERSEY_COLOR_RUSH: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'black', outline: 'none' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'm' },
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'black',
    outline: 'black',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: BENGALS_BLOCK_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: BENGALS_COLOR_RUSH_SLEEVES },
    { paint: 'over', mark: BENGALS_COLOR_RUSH_CHEST },
  ],
};
