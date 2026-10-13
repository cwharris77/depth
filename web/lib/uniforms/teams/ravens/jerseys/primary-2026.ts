import type { CompleteJerseySpec } from '../../core/complete';
import { RAVENS_JERSEY_PURPLE } from './purple';
import { ravensSleeveBands } from '../marks/construction';
import { RAVENS_NUMBER_THREE } from '../marks/numbers';
import {
  ravensCollarWings,
  RAVENS_2026_HOME_WORDMARK,
  RAVENS_2026_AWAY_WORDMARK,
} from '../marks/primary-2026';
import { ravensSleeveShields } from '../marks/shield';

// Purple body and collar with dark feathers down the collar band, white shoulder and chest
// numerals with a midnight outline, the white-bordered shield above a black band on each sleeve.
export const RAVENS_JERSEY_PURPLE_2026: CompleteJerseySpec = {
  ...RAVENS_JERSEY_PURPLE,
  shoulderNumber: { fill: 'white', outline: 'midnight' },
  number: {
    fill: 'white',
    outline: 'midnight',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: RAVENS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [
    { paint: 'over', mark: ravensSleeveBands('black') },
    { paint: 'over', mark: ravensCollarWings('black') },
    { paint: 'over', mark: ravensSleeveShields('ravens-2026-shield', 'white') },
    { paint: 'over', mark: RAVENS_2026_HOME_WORDMARK },
  ],
};

// White body and collar with purple feathers down the collar band, purple numerals and a
// purple band at each sleeve hem.
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
  number: {
    fill: 'purple',
    outline: 'midnight',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: RAVENS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [
    { paint: 'over', mark: ravensSleeveBands('purple') },
    { paint: 'over', mark: ravensCollarWings('purple') },
    { paint: 'over', mark: ravensSleeveShields('ravens-2026-shield', null) },
    { paint: 'over', mark: RAVENS_2026_AWAY_WORDMARK },
  ],
};
