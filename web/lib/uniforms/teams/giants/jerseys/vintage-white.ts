import type { CompleteJerseySpec } from '../../core/complete';
import { GIANTS_VINTAGE_WHITE_CUFF_STRIPES, giantsChestMonogram } from '../marks/construction';
import { GIANTS_NUMBER_THREE } from '../marks/numbers';

// White body with a royal V collar around a red inset, royal sleeve numerals edged red over
// royal/red/royal cuff stripes, royal numerals edged red, and the royal monogram on the chest.
export const GIANTS_JERSEY_VINTAGE_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'royal',
    trim: 'red',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'royal', outline: 'red' },
  number: {
    height: 185,
    fill: 'royal',
    outline: 'red',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: GIANTS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: GIANTS_VINTAGE_WHITE_CUFF_STRIPES },
    { paint: 'over', mark: giantsChestMonogram('royal') },
  ],
};
