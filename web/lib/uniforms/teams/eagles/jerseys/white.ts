import type { CompleteJerseySpec } from '../../core/complete';
import { eaglesSleeveWing } from '../marks/construction';

// White body, a black V collar and a black sleeve hem band; green numerals keylined black, the
// same on the shoulders.
export const EAGLES_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
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
  shoulderNumber: { fill: 'green', outline: 'black' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'm' },
  sleeveNumber: 'none',
  number: { fill: 'green', outline: 'black', outlineWeight: 'regular', texture: 'mesh' },
  marks: [eaglesSleeveWing()],
};
