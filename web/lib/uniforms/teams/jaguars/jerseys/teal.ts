import { JAGUARS_CHEST_HEAD, JAGUARS_CUFF, JAGUARS_MODERN_COLLAR } from '../marks/construction';
import type { CompleteJerseySpec } from '../../core/complete';
import { JAGUARS_NUMBER_THREE } from '../marks/numbers';

export const JAGUARS_JERSEY_TEAL: CompleteJerseySpec = {
  body: 'teal',
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
    outline: 'teal',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: JAGUARS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: JAGUARS_CHEST_HEAD },
    { paint: 'over', mark: JAGUARS_MODERN_COLLAR('teal', 'black') },
    { paint: 'over', mark: JAGUARS_CUFF('black') },
  ],
};
