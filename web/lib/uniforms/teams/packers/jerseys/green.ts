// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, sleeveStripes } from '../parts';

// Green body (home): gold/white/gold sleeve set, concentric collar, white numerals.
export const JERSEY_GREEN: UniformPart = {
  base: 'green',
  layers: [...sleeveStripes(), ...collar()],
  number: { fill: 'white', outline: 'white', outlineWidth: 26 },
};
