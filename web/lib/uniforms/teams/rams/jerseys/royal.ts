import type { CompleteJerseySpec } from '../../core/complete';
import { ramsSleeveMark } from '../marks/construction';

// Royal body with a body-coloured collar, a gold band and tail on each sleeve and flat gold numerals.
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
  marks: [{ paint: 'over', mark: ramsSleeveMark('gold', 'gold') }],
};
