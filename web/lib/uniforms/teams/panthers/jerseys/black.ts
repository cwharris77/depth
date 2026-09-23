// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, shoulderFan } from '../parts';

// Black-alternate jersey (J3): black body, silver-outside-blue fan, blue collar, white numerals.
export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...shoulderFan('silver', 'blue'), ...collar('blue')],
  number: { fill: 'white', outline: 'blue', outlineWidth: 14 },
};
