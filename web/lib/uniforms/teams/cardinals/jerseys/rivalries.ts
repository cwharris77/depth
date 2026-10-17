import { CARDINALS_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_RIVALRIES_JERSEY_ART } from '../marks/jersey-art';

// Speckled cream body with state flag sleeve patches and an orange numeral shadow.
export const CARDINALS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'cream',
  collar: {
    style: 'inset-v',
    color: 'cream',
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
    height: 175,
    fill: 'rivalRed',
    outline: 'rivalOrange',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: CARDINALS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: CARDINALS_RIVALRIES_JERSEY_ART }],
};
