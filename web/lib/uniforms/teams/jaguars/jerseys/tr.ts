// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { throwbackBands } from '../parts';

// Teal throwback jersey (J3): teal body, gold/black two-band + black collar V, white numerals
// keylined gold.
export const JERSEY_TR: UniformPart = {
  base: 'teal',
  layers: throwbackBands('gold', 'black'),
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};
