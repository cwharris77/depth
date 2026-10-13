import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_NUMBER_THREE } from '../marks/numbers';
import { COMMANDERS_SLEEVE_BAND_BURGUNDY } from '../marks/construction';

// White body, a burgundy band around a gold line on each sleeve, burgundy numerals stippled white inside a black outline. A burgundy V collar band over a white neck.
export const COMMANDERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'burgundy',
    trim: 'none',
    inside: 'white',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'pattern:commanders-number-stipple',
    outline: 'black',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: COMMANDERS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: COMMANDERS_SLEEVE_BAND_BURGUNDY }],
};
