import type { CompleteJerseySpec } from '../../core/complete';
import { GIANTS_THROWBACK_CUFF_STRIPES } from '../marks/construction';

// Royal body with a red V collar around a white inset, white sleeve numerals over red/white/red
// cuff stripes, and white numerals edged red.
export const GIANTS_JERSEY_THROWBACK: CompleteJerseySpec = {
  body: 'royal',
  collar: {
    style: 'inset-v',
    color: 'red',
    trim: 'white',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'white' },
  number: { fill: 'white', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: GIANTS_THROWBACK_CUFF_STRIPES }],
};
