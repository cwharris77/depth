import { BENGALS_CHEST_WORDMARK_BLACK } from '../marks/wordmark';
import { BENGALS_PAUL_BROWN_SIGNATURE_BLACK } from '../marks/signature';
import type { CompleteJerseySpec } from '../../core/complete';
import { BENGALS_NUMBER_THREE } from '../marks/numbers';
import { bengalsSleeveTigers } from '../marks/construction';

// Black tiger sleeve caps, and white numerals keylined black.
export const BENGALS_JERSEY_ORANGE: CompleteJerseySpec = {
  body: 'orange',
  collar: {
    style: 'inset-v',
    color: 'orange',
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
    height: 195,
    fill: 'white',
    outline: 'black',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: BENGALS_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: bengalsSleeveTigers('black') },
    { paint: 'over', mark: BENGALS_CHEST_WORDMARK_BLACK },
    { paint: 'over', mark: BENGALS_PAUL_BROWN_SIGNATURE_BLACK },
  ],
};
