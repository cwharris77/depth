import type { CompleteJerseySpec } from '../../core/complete';
import { STEELERS_SLEEVE_STRIPES } from '../marks/construction';

// Black body with a body-coloured V collar and grey keylines, white shoulder numerals, the gold and white sleeve stripe set and plain white numerals.
export const STEELERS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
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
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'black', outlineWeight: 'none', texture: 'mesh' },
  marks: [{ paint: 'under', mark: STEELERS_SLEEVE_STRIPES }],
};
