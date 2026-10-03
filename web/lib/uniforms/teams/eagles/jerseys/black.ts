import type { CompleteJerseySpec } from '../../core/complete';
import { eaglesSleeveWing } from '../marks/construction';

// Black body with a midnight-green V collar and sleeve hem band; white numerals keylined green,
// the same on the shoulders.
export const EAGLES_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'green',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'green' },
  sleeveStripes: 'none',
  cuff: { color: 'green', size: 'm' },
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'green', outlineWeight: 'regular', texture: 'mesh' },
  marks: [eaglesSleeveWing()],
};
