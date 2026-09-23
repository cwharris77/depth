// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, sleeveBands } from '../parts';

// Away jersey (J2): white body, green bands + collar, green numerals.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBands('green'), ...collar('green')],
  number: { fill: 'green', outline: 'green', outlineWidth: 10 },
};
