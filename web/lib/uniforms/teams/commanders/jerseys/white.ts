// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sleeveBand } from '../parts';

// Away jersey: white body, burgundy band around a gold line, burgundy numerals keylined gold.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveBand('burgundy', 'gold'),
  number: { fill: 'burgundy', outline: 'gold', outlineWidth: 14 },
};
