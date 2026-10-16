import { JAGUARS_CHEST_HEAD, JAGUARS_CUFF, JAGUARS_MODERN_COLLAR } from '../marks/construction';
import type { CompleteJerseySpec } from '../../core/complete';
import { JAGUARS_NUMBER_THREE } from '../marks/numbers';

export const JAGUARS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'black', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'black',
    outline: 'white',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: JAGUARS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: JAGUARS_CHEST_HEAD },
    { paint: 'over', mark: JAGUARS_MODERN_COLLAR('white', 'black') },
    { paint: 'over', mark: JAGUARS_CUFF('black') },
  ],
};
