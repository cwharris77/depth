import { TITANS_2018_CHEST_WORDMARK } from '../marks/wordmark';
import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_2018_NUMBER_THREE } from '../marks/numbers';
import {
  TITANS_2018_NAVY_PANELS,
  TITANS_2018_NECK_STARS,
  TITANS_2018_NAVY_NUMBERS,
  TITANS_2018_NAVY_NIKE,
} from '../marks/construction';

export const JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
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
    height: 190,
    fill: 'white',
    outline: 'lightBlue',
    outlineWeight: 'regular',
    texture: 'plain',
    glyphPath: TITANS_2018_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: TITANS_2018_CHEST_WORDMARK },
    { paint: 'under', mark: TITANS_2018_NAVY_PANELS },
    { paint: 'under', mark: TITANS_2018_NAVY_NUMBERS },
    { paint: 'over', mark: TITANS_2018_NAVY_NIKE },
    { paint: 'over', mark: TITANS_2018_NECK_STARS },
  ],
};
