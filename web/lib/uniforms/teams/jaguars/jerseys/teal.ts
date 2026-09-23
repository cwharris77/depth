// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collarArcs, sleeveBand } from '../parts';

// Home jersey (J1): teal body, black band + collar arcs, white numerals.
export const JERSEY_TEAL: UniformPart = {
  base: 'teal',
  layers: [...sleeveBand('black'), ...collarArcs('black')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
