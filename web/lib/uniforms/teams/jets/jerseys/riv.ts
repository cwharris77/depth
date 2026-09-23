// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, sleeveBands } from '../parts';

// Rivalries jersey (J3): rivalries-green body, black bands + collar, white numerals.
export const JERSEY_RIV: UniformPart = {
  base: 'rivalGreen',
  layers: [...sleeveBands('black'), ...collar('black')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
