import type { CompleteJerseySpec } from '../../core/complete';
import { LIONS_BANDS_BLUE_SILVER } from '../marks/construction';

// White body with a white V collar keylined grey over a blue back bar, blue shoulder numerals, a
// blue and silver four-band set on each sleeve (drawn by the bands mark) and blue numerals
// outlined silver.
export const LIONS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'blue',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'blue', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'blue', outline: 'silver', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: LIONS_BANDS_BLUE_SILVER }],
};
