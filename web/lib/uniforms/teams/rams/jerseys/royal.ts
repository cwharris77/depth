import type { CompleteJerseySpec } from '../../core/complete';
import { ramsCappedSleeveHorn } from '../marks/construction';

// Royal body with a body-coloured collar, yellow sleeve horns and flat gold numerals.
export const RAMS_JERSEY_ROYAL: CompleteJerseySpec = {
  body: 'royal',
  collar: {
    style: 'inset-v',
    color: 'royal',
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
  number: { fill: 'gold', outline: 'white', outlineWeight: 'none', texture: 'plain' },
  marks: [{ paint: 'over', mark: ramsCappedSleeveHorn('yellow', 'yellow') }],
};
