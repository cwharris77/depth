// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, cuff } from '../parts';

// Home jersey (J1): midnight-green body, black cuff + collar, white numerals keylined black.
export const JERSEY_GREEN: UniformPart = {
  base: 'green',
  layers: [...cuff('black'), ...collar('black')],
  number: { fill: 'white', outline: 'black', outlineWidth: 14 },
};
