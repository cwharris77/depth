import type { CompleteJerseySpec } from '../../core/complete';
import { FALCONS_JERSEY_RED } from './red';
import {
  FALCONS_2026_SLEEVE_LOGOS,
  FALCONS_2026_HOME_WORDMARK,
  FALCONS_2026_AWAY_WORDMARK,
} from '../marks/primary-2026';

export const FALCONS_JERSEY_RED_2026: CompleteJerseySpec = {
  ...FALCONS_JERSEY_RED,
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderNumber: { fill: 'white', outline: 'black' },
  number: { fill: 'white', outline: 'black', outlineWeight: 'thin', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: FALCONS_2026_SLEEVE_LOGOS },
    { paint: 'over', mark: FALCONS_2026_HOME_WORDMARK },
  ],
};

export const FALCONS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...FALCONS_JERSEY_RED_2026,
  body: 'white',
  shoulderNumber: { fill: 'red', outline: 'black' },
  number: { fill: 'red', outline: 'black', outlineWeight: 'thin', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: FALCONS_2026_SLEEVE_LOGOS },
    { paint: 'over', mark: FALCONS_2026_AWAY_WORDMARK },
  ],
};
