import type { CompleteJerseySpec } from '../../core/complete';
import { DOLPHINS_THROWBACK_SLEEVE_BANDS } from '../marks/construction';

// 1972 throwback: teal body, a five-band white-over-orange sleeve set, white numerals keylined
// orange.
export const DOLPHINS_JERSEY_1972: CompleteJerseySpec = {
  body: 'teal',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'orange' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: DOLPHINS_THROWBACK_SLEEVE_BANDS }],
};
