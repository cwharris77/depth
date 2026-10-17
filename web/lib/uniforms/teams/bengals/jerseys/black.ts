import type { CompleteJerseySpec } from '../../core/complete';
import { BENGALS_NUMBER_THREE } from '../marks/numbers';
import { bengalsSleeveTigers } from '../marks/construction';
import { BENGALS_CHEST_WORDMARK } from '../marks/wordmark';
import { BENGALS_PAUL_BROWN_SIGNATURE } from '../marks/signature';

// Orange tiger sleeve caps, and white numerals keylined orange.
export const BENGALS_JERSEY_BLACK: CompleteJerseySpec = {
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
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'white',
    outline: 'orange',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: BENGALS_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: bengalsSleeveTigers('orange') },
    { paint: 'over', mark: BENGALS_CHEST_WORDMARK },
    { paint: 'over', mark: BENGALS_PAUL_BROWN_SIGNATURE },
  ],
};
