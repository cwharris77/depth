import type { CompleteJerseySpec } from '../../core/complete';
import { SAINTS_NUMBER_THREE } from '../marks/numbers';

// White body with a black V collar band, black shoulder numerals, black numerals keylined gold.
export const SAINTS_JERSEY_WHITE: CompleteJerseySpec = {
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
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'black',
    outline: 'gold',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: SAINTS_NUMBER_THREE,
  },
  marks: [],
};
