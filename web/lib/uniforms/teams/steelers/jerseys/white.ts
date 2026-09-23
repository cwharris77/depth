import type { UniformPart } from '../../core/parts';
import { fill, sleeveStripes } from '../parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes(),
  number: { fill: 'black', outline: 'gold', outlineWidth: 26 },
};
