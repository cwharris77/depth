import type { UniformPart } from '../../core/parts';
import { sleeveStripes } from '../parts';

export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: sleeveStripes(),
  number: { fill: 'white', outline: 'gold', outlineWidth: 26 },
};
