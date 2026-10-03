import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_SLEEVE_BAND_BURGUNDY } from '../marks/construction';

// White body, a burgundy band around a gold line on each sleeve, burgundy numerals keylined gold. A burgundy V collar band over a white neck.
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
  number: { fill: 'burgundy', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: COMMANDERS_SLEEVE_BAND_BURGUNDY }],
};
