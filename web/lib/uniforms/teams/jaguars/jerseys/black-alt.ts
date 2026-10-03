import type { CompleteJerseySpec } from '../../core/complete';
import { JAGUARS_BLACK_ALT_TRIM } from '../marks/construction';

// Black body with gold sleeve bands and neck arcs drawn by the trim mark, and white numerals
// outlined in gold.
export const JAGUARS_JERSEY_BLACK_ALT: CompleteJerseySpec = {
  body: 'black',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: JAGUARS_BLACK_ALT_TRIM }],
};
