import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_BROWN: UniformPart = {
  base: 'brown',
  layers: parts.sleeveStripes('white', 'orange'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
