import type { CompleteJerseySpec } from '../../core/complete';
import { RAVENS_JERSEY_PURPLE } from './purple';
import {
  RAVENS_2026_WINGS,
  RAVENS_2026_SHIELDS,
  RAVENS_2026_HOME_WORDMARK,
  RAVENS_2026_AWAY_WORDMARK,
} from '../marks/primary-2026';

export const RAVENS_JERSEY_PURPLE_2026: CompleteJerseySpec = {
  ...RAVENS_JERSEY_PURPLE,
  shoulderNumber: { fill: 'white', outline: 'midnight' },
  number: { fill: 'white', outline: 'midnight', outlineWeight: 'thin', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: RAVENS_2026_WINGS },
    { paint: 'over', mark: RAVENS_2026_SHIELDS },
    { paint: 'over', mark: RAVENS_2026_HOME_WORDMARK },
  ],
};
export const RAVENS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...RAVENS_JERSEY_PURPLE_2026,
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
  shoulderNumber: { fill: 'purple', outline: 'midnight' },
  number: { fill: 'purple', outline: 'midnight', outlineWeight: 'thin', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: RAVENS_2026_WINGS },
    { paint: 'over', mark: RAVENS_2026_SHIELDS },
    { paint: 'over', mark: RAVENS_2026_AWAY_WORDMARK },
  ],
};
