// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, sleeveStripes } from '../parts';

// White body (away + winter-warning): the same gold/white/gold sleeve set and collar, green
// numerals. One part, two kits — the factoring the flat form spelled out twice.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveStripes(), ...collar()],
  number: { fill: 'green', outline: 'green', outlineWidth: 26 },
};
