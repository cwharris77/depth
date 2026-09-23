// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, sleeveBands } from '../parts';

// Black-alt jersey (J4): black body, green bands + collar, white numerals.
export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...sleeveBands('green'), ...collar('green')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
