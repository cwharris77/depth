import type { CompleteJerseySpec } from '../../core/complete';
import { FALCONS_JERSEY_RED } from './red';
import { FALCONS_NUMBER_THREE } from '../marks/numbers';
import {
  FALCONS_2026_SLEEVE_LOGOS,
  FALCONS_2026_HOME_WORDMARK,
  FALCONS_2026_AWAY_WORDMARK,
} from '../marks/primary-2026';

// Red body and collar, white block numerals keylined black on the chest and shoulders, the
// falcon on each sleeve.
export const FALCONS_JERSEY_RED_2026: CompleteJerseySpec = {
  ...FALCONS_JERSEY_RED,
  shoulderNumber: { fill: 'white', outline: 'black' },
  number: {
    fill: 'white',
    outline: 'black',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: FALCONS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [
    { paint: 'over', mark: FALCONS_2026_SLEEVE_LOGOS },
    { paint: 'over', mark: FALCONS_2026_HOME_WORDMARK },
  ],
};

// White body and collar with red numerals keylined black.
export const FALCONS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...FALCONS_JERSEY_RED_2026,
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
  shoulderNumber: { fill: 'red', outline: 'black' },
  number: {
    fill: 'red',
    outline: 'black',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: FALCONS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [
    { paint: 'over', mark: FALCONS_2026_SLEEVE_LOGOS },
    { paint: 'over', mark: FALCONS_2026_AWAY_WORDMARK },
  ],
};
