// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { throwbackStripes } from '../parts';

// 1972 throwback jersey (J4): teal body, five-band sleeve set, white numerals keylined orange.
export const JERSEY_1972: UniformPart = {
  base: 'teal',
  layers: throwbackStripes('white', 'orange'),
  number: { fill: 'white', outline: 'orange', outlineWidth: 16 },
};
