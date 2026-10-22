import type { CompleteJerseySpec } from '../../core/complete';
import { VIKINGS_NUMBER_THREE } from '../marks/numbers';
import { VIKINGS_WINTER_COLLAR, VIKINGS_WINTER_WORDMARK } from '../marks/winter-warrior';

export const VIKINGS_JERSEY_WINTER_WHITE: CompleteJerseySpec = {
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
  sleeveStripes: {
    bands: [
      { color: 'metallicGray', size: 's' },
      { color: 'purple', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 175,
    fill: 'purple',
    outline: 'metallicGray',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: VIKINGS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: VIKINGS_WINTER_WORDMARK },
    { paint: 'over', mark: VIKINGS_WINTER_COLLAR },
  ],
};
