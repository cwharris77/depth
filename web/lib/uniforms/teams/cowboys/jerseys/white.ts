import type { CompleteJerseySpec } from '../../core/complete';
import { COWBOYS_SLEEVE_CAPS_NAVY } from '../marks/construction';

// White body under navy sleeve caps, a keylined white V collar, navy numerals.
export const COWBOYS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
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
  sleeveNumber: { fill: 'white' },
  number: { fill: 'navy', outline: 'navy', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: COWBOYS_SLEEVE_CAPS_NAVY }],
};
