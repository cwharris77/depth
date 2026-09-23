// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, shoulderFan } from '../parts';

// Away jersey (J2): white body, the fan inverted to black-outside-blue, black collar, black
// numerals.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulderFan('black', 'blue'), ...collar('black')],
  number: { fill: 'black', outline: 'blue', outlineWidth: 14 },
};
