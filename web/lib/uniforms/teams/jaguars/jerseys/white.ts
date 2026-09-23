// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collarArcs, sleeveBand } from '../parts';

// Away jersey (J2): white body, black band + collar arcs, black numerals.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBand('black'), ...collarArcs('black')],
  number: { fill: 'black', outline: 'black', outlineWidth: 10 },
};
