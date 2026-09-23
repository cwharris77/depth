// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sleeveStripes } from '../parts';

// Gridiron-gray jersey: silver body, blue/white four-band set, white numerals ringed blue.
// INFERRED — no silver jersey appears in the 2025 reference (see lions.ts).
export const JERSEY_GRAY: UniformPart = {
  base: 'silver',
  layers: sleeveStripes('blue', 'white'),
  number: { fill: 'white', outline: 'blue', outlineWidth: 14 },
};
