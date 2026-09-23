// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, cuff } from '../parts';

// Black-alt jersey (J4): black body, silver cuff + collar, white numerals keylined silver.
export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...cuff('silver'), ...collar('silver')],
  number: { fill: 'white', outline: 'silver', outlineWidth: 14 },
};
