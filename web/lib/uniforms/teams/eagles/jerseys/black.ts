import type { CompleteJerseySpec } from '../../core/complete';
import { eaglesSleeveWing } from '../marks/construction';
import { EAGLES_NUMBER_THREE } from '../marks/numbers';

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
  number: {
    height: 190,
    fill: 'white',
    outline: 'green',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: EAGLES_NUMBER_THREE,
  },
  marks: [eaglesSleeveWing()],
};
