import type { CompleteJerseySpec } from '../../core/complete';
import { ramsSleeveMark } from '../marks/construction';

// Near-black body with a body-coloured collar and white meshed numerals. The sleeve tail is royal against a yellow band.
export const RAMS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
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
  number: { fill: 'white', outline: 'royal', outlineWeight: 'none', texture: 'mesh' },
  marks: [{ paint: 'over', mark: ramsSleeveMark('yellow', 'royal') }],
};
