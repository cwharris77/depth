import type { CompleteJerseySpec } from '../../core/complete';
import { RAVENS_JERSEY_PURPLE } from './purple';
import { RAVENS_NUMBER_THREE } from '../marks/numbers';
import { RAVENS_PURPLE_RISING_WORDMARK } from '../marks/primary-2026';
import { ravensSleeveShields } from '../marks/shield';

// Purple body and plain purple collar, gold shoulder and chest numerals with a white outline, the
// gold chest wordmark and a tonal gold-bordered shield on each plain sleeve.
export const RAVENS_JERSEY_PURPLE_RISING: CompleteJerseySpec = {
  ...RAVENS_JERSEY_PURPLE,
  shoulderNumber: { fill: 'gold', outline: 'white' },
  number: {
    height: 200,
    fill: 'gold',
    outline: 'white',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: RAVENS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [
    {
      paint: 'over',
      mark: ravensSleeveShields('ravens-purple-rising-shield', 'gold', {
        black: 'purple',
        gold: 'gold',
        white: 'midnight',
        red: 'gold',
      }),
    },
    { paint: 'over', mark: RAVENS_PURPLE_RISING_WORDMARK },
  ],
};
