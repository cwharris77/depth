// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, cuff } from '../parts';

// Away jersey (J3): white body, black cuff + collar, green numerals keylined black.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...cuff('black'), ...collar('black')],
  number: { fill: 'green', outline: 'black', outlineWidth: 14 },
};
