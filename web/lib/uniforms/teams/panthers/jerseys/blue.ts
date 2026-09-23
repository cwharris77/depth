// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, shoulderFan } from '../parts';

// Home jersey (J1): blue body, white-outside-black fan, black collar, white numerals.
export const JERSEY_BLUE: UniformPart = {
  base: 'blue',
  layers: [...shoulderFan('white', 'black'), ...collar('black')],
  number: { fill: 'white', outline: 'black', outlineWidth: 14 },
};
