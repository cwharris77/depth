import {
  BILLS_RIVALRIES_CHEST_WORDMARK,
  BILLS_RIVALRIES_COLLAR_LABEL,
  BILLS_RIVALRIES_SLEEVE_LOGO,
} from '../marks/jersey-art';
import { BILLS_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';

// Tone-on-tone: a white body with an unbanded white collar, kept legible by the shared keylines,
// and silver numerals outlined in navy on the chest and along both shoulders. Navy BUFFALO across
// the chest, BILLS MAFIA inside the neck and a silver logo on each sleeve. No red anywhere.
export const BILLS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'white',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'rivalriesNumber', outline: 'navy' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'rivalriesNumber',
    outline: 'navy',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: BILLS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: BILLS_RIVALRIES_SLEEVE_LOGO },
    { paint: 'over', mark: BILLS_RIVALRIES_CHEST_WORDMARK },
    { paint: 'over', mark: BILLS_RIVALRIES_COLLAR_LABEL },
  ],
};
