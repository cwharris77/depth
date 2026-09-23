// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar, sleeveBands } from '../parts';

// Home jersey (J1): green body, white bands + collar, white numerals.
export const JERSEY_GREEN: UniformPart = {
  base: 'green',
  layers: [...sleeveBands('white'), ...collar('white')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
