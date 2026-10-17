import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_2018_NUMBER_THREE } from '../marks/numbers';
import {
  TITANS_2018_NAVY_PANELS,
  TITANS_2018_NAVY_NUMBERS,
  TITANS_2018_NAVY_NIKE,
  TITANS_2018_NECK_STARS,
} from '../marks/construction';
import { TITANS_2018_NAVY_WORDMARK } from '../marks/wordmark';

export const JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'navy',
    outline: 'lightBlue',
    outlineWeight: 'regular',
    texture: 'plain',
    glyphPath: TITANS_2018_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: TITANS_2018_NAVY_PANELS },
    { paint: 'under', mark: TITANS_2018_NAVY_NUMBERS },
    { paint: 'over', mark: TITANS_2018_NAVY_NIKE },
    { paint: 'over', mark: TITANS_2018_NECK_STARS },
    { paint: 'over', mark: TITANS_2018_NAVY_WORDMARK },
  ],
};
