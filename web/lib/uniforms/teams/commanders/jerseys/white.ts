import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_SLEEVE_BAND_BURGUNDY } from '../marks/construction';

// White body, a burgundy band around a gold line on each sleeve, burgundy numerals keylined gold.
export const COMMANDERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'burgundy', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: COMMANDERS_SLEEVE_BAND_BURGUNDY }],
};
