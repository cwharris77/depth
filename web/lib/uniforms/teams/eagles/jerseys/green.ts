import type { CompleteJerseySpec } from '../../core/complete';
import { eaglesSleeveHead } from '../marks/construction';
import { EAGLES_NUMBER_THREE } from '../marks/numbers';
import { EAGLES_CHEST_WORDMARK } from '../marks/wordmark';

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
  number: {
    height: 190,
    fill: 'white',
    outline: 'black',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: EAGLES_NUMBER_THREE,
  },
  marks: [eaglesSleeveHead(), { paint: 'over', mark: EAGLES_CHEST_WORDMARK }],
};
