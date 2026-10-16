import { FALCONS_GRADIENT_FIELD } from '../marks/gradient-2020';
import { falcons2020Wordmark } from '../marks/wordmark-2020';
import { FALCONS_SLEEVE_LOGOS } from '../marks/sleeves';
import { FALCONS_2020_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';
import { falconsSideStripes } from '../marks/construction';

// Red-to-black gradient body with a red V collar keylined grey, white side piping, and white numerals keylined black.
export const FALCONS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'red',
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
    fill: 'white',
    outline: 'black',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: FALCONS_2020_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: FALCONS_GRADIENT_FIELD },
    { paint: 'under', mark: falconsSideStripes('white') },
    { paint: 'over', mark: FALCONS_SLEEVE_LOGOS },
    { paint: 'over', mark: falcons2020Wordmark('white') },
  ],
};
