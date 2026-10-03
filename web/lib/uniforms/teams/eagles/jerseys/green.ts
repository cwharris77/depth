import type { CompleteJerseySpec } from '../../core/complete';
import { eaglesSleeveWing } from '../marks/construction';

// Midnight-green body, a black V collar over the body colour and a black sleeve hem band; white
// numerals keylined black, the same on the shoulders.
export const EAGLES_JERSEY_GREEN: CompleteJerseySpec = {
  body: 'green',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'black' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'm' },
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'black', outlineWeight: 'regular', texture: 'mesh' },
  marks: [eaglesSleeveWing()],
};
