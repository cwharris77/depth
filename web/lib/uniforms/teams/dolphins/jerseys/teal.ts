import { DOLPHINS_MODERN_SLEEVE_MARKS } from '../marks/sleeves';
import type { CompleteJerseySpec } from '../../core/complete';
import { DOLPHINS_NUMBER_THREE } from '../marks/numbers';

// Home: teal body, a keylined teal collar, no sleeve trim, white numerals keylined orange.
export const DOLPHINS_JERSEY_TEAL: CompleteJerseySpec = {
  body: 'teal',
  collar: {
    style: 'inset-v',
    color: 'teal',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'orange' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'white',
    outline: 'orange',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: DOLPHINS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: DOLPHINS_MODERN_SLEEVE_MARKS }],
};
