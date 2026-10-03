import type { CompleteJerseySpec } from '../../core/complete';
import { LIONS_BANDS_BLUE_WHITE } from '../marks/construction';

// Silver body with a blue and white four-band set on each sleeve (drawn by the bands mark) and
// white numerals outlined blue. No collar is drawn.
export const LIONS_JERSEY_GRAY: CompleteJerseySpec = {
  body: 'silver',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'blue', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: LIONS_BANDS_BLUE_WHITE }],
};
