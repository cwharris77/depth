import { TITANS_2026_AWAY_WORDMARK } from '../marks/wordmark-2026';
import { TITANS_2026_NECK_TAB, TITANS_2026_SIDE_VENTS } from '../marks/details-2026';
import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_BLOCK_NUMBER_THREE } from '../marks/numbers';
import { TITANS_2026_SLEEVES } from '../marks/construction';

export const JERSEY_WHITE_2026: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'lightBlue2026', outline: 'red2026' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'lightBlue2026',
    outline: 'red2026',
    outlineWeight: 'regular',
    texture: 'plain',
    glyphPath: TITANS_BLOCK_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: TITANS_2026_SLEEVES },
    { paint: 'over', mark: TITANS_2026_AWAY_WORDMARK },
    { paint: 'over', mark: TITANS_2026_NECK_TAB },
    { paint: 'over', mark: TITANS_2026_SIDE_VENTS },
  ],
};
