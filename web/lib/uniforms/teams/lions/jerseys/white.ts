// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sleeveStripes } from '../parts';

// Away jersey: white body, blue/silver four-band set (inverted), blue numerals. Band bounds are
// the home figure's — the two-kit approximation noted in lions.ts.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes('blue', 'silver'),
  number: { fill: 'blue', outline: 'blue', outlineWidth: 10 },
};
