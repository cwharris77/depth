import type { CompleteJerseySpec } from '../../core/complete';
import { COWBOYS_SLEEVE_CAPS_NAVY } from '../marks/construction';

// White body under navy sleeve caps, navy numerals.
export const COWBOYS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'white' },
  number: { fill: 'navy', outline: 'navy', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: COWBOYS_SLEEVE_CAPS_NAVY }],
};
