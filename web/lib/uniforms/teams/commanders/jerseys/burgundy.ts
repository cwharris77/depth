// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sleeveBand } from '../parts';

// Burgundy jersey (home + 70s-burgundy): burgundy body, gold band around a white line, gold
// numerals keylined white.
export const JERSEY_BURGUNDY: UniformPart = {
  base: 'burgundy',
  layers: sleeveBand('gold', 'white'),
  number: { fill: 'gold', outline: 'white', outlineWidth: 14 },
};
