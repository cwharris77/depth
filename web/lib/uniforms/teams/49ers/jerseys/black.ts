import { NINERS_BLACK_CHEST, NINERS_RIVAL_NUMBER_SHADOW } from '../marks/jersey-art';
import { NINERS_RIVAL_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';

// Red sleeve stripes and shoulder numerals; red body numerals with a gold outline.
export const NINERS_JERSEY_BLACK: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'red', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'red', size: 'm' },
      { color: 'red', size: 'm' },
      { color: 'red', size: 'm' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'red',
    outline: 'gold',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: NINERS_RIVAL_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: NINERS_RIVAL_NUMBER_SHADOW },
    { paint: 'over', mark: NINERS_BLACK_CHEST },
  ],
};
