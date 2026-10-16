import type { CompleteJerseySpec } from '../../core/complete';
import { JAGUARS_NUMBER_THREE } from '../marks/numbers';
import { JAGUARS_CHEST_HEAD, JAGUARS_CUFF, JAGUARS_MODERN_COLLAR } from '../marks/construction';

export const JAGUARS_JERSEY_BLACK_ALT: CompleteJerseySpec = {
  body: 'black',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'white',
    outline: 'black',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: JAGUARS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: JAGUARS_CHEST_HEAD },
    { paint: 'over', mark: JAGUARS_MODERN_COLLAR('black', 'teal') },
    { paint: 'over', mark: JAGUARS_CUFF('teal') },
  ],
};
