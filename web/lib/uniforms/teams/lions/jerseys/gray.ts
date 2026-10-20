import { LIONS_GRAY_RIGHT, LIONS_GRAY_LEFT } from '../marks/labels';
import { LIONS_2017_NUMBER_THREE } from '../marks/numbers';
import type { CompleteJerseySpec } from '../../core/complete';
import { LIONS_GRAY_SLEEVE_BANDS } from '../marks/construction';

// Dark steel body, blue and white sleeve bands, and white numerals outlined blue.
export const LIONS_JERSEY_GRAY: CompleteJerseySpec = {
  body: 'darkSteel',
  collar: {
    style: 'inset-v',
    color: 'darkSteel',
    trim: 'none',
    inside: 'darkSteel',
    lining: 'none',
    backBar: 'darkSteel',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'blue' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'white',
    outline: 'blue',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: LIONS_2017_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: LIONS_GRAY_SLEEVE_BANDS },
    { paint: 'over', mark: LIONS_GRAY_RIGHT },
    { paint: 'over', mark: LIONS_GRAY_LEFT },
  ],
};
