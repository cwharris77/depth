// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collarArcs, sleeveBand } from '../parts';

// black-alt jersey (J4): black body, gold band + collar arcs, white numerals keylined gold.
export const JERSEY_BLACK_ALT: UniformPart = {
  base: 'black',
  layers: [...sleeveBand('gold'), ...collarArcs('gold')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};
