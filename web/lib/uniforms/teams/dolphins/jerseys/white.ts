import { DOLPHINS_CHEST_WORDMARK } from '../marks/wordmark';
import { DOLPHINS_MIAMI_COLLAR_LETTERING } from '../marks/collar';
import { DOLPHINS_HOME_SLEEVE_NIKE } from '../marks/sleeves';
import { DOLPHINS_MODERN_SLEEVE_MARKS } from '../marks/sleeves';
import type { CompleteJerseySpec } from '../../core/complete';
import { DOLPHINS_NUMBER_THREE } from '../marks/numbers';

// Away: white body, a keylined white collar, no sleeve trim, teal numerals keylined orange.
export const DOLPHINS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'teal', outline: 'orange' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'teal',
    outline: 'orange',
    outlineWeight: 'regular',
    texture: 'plain',
    glyphPath: DOLPHINS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: DOLPHINS_MODERN_SLEEVE_MARKS },
    { paint: 'over', mark: DOLPHINS_HOME_SLEEVE_NIKE },
    { paint: 'over', mark: DOLPHINS_CHEST_WORDMARK },
    { paint: 'over', mark: DOLPHINS_MIAMI_COLLAR_LETTERING },
  ],
};
