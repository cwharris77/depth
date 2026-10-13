import type { CompleteJerseySpec } from '../../core/complete';
import { ramsCappedSleeveHorn } from '../marks/construction';

// White body with a body-coloured collar, a split royal horn over each yellow outer sleeve, a gold cuff and flat royal numerals.
export const RAMS_JERSEY_WHITE: CompleteJerseySpec = {
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
  sleeveStripes: 'none',
  cuff: { color: 'gold', size: 'm' },
  sleeveNumber: 'none',
  number: { fill: 'royal', outline: 'gold', outlineWeight: 'none', texture: 'plain' },
  marks: [{ paint: 'under', mark: ramsCappedSleeveHorn('royal', 'yellow', 'panel') }],
};
