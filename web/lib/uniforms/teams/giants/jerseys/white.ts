import type { CompleteJerseySpec } from '../../core/complete';
import { giantsChestMonogram } from '../marks/construction';
import { GIANTS_NUMBER_THREE } from '../marks/numbers';

// White body with a white V collar keylined grey, red shoulder numerals, a thin/thick/thin set of
// red sleeve stripes, plain red numerals, and the red monogram on the chest.
export const GIANTS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'red', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'red', size: 's' },
      { color: 'red', size: 'l' },
      { color: 'red', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'red',
    outline: 'red',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: GIANTS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: giantsChestMonogram('red') }],
};
