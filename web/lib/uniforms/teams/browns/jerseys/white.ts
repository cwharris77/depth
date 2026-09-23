import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: parts.sleeveStripes('brown', 'orange'),
  number: { fill: 'brown', outline: 'brown', outlineWidth: 10 },
};
