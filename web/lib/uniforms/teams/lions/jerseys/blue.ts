// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sleeveStripes } from '../parts';

// Home jersey: blue body, silver/white four-band set, white numerals.
export const JERSEY_BLUE: UniformPart = {
  base: 'blue',
  layers: sleeveStripes('silver', 'white'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
