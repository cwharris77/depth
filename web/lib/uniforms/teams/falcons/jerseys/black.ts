import { falcons2020Wordmark } from '../marks/wordmark-2020';
import { FALCONS_SLEEVE_LOGOS } from '../marks/sleeves';
import { FALCONS_2020_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';
import { falconsSideStripes } from '../marks/construction';

// Black body with a black V collar keylined grey, white shoulder numerals edged red, red side piping, and white numerals keylined red.
export const FALCONS_JERSEY_BLACK: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'white', outline: 'red' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'white',
    outline: 'red',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: FALCONS_2020_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: falconsSideStripes('red') },
    { paint: 'over', mark: FALCONS_SLEEVE_LOGOS },
    { paint: 'over', mark: falcons2020Wordmark('red') },
  ],
};
