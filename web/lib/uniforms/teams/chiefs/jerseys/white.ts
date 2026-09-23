import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: parts.sleeveStripes('red', 'gold'),
  number: { fill: 'red', outline: 'gold', outlineWidth: 22 },
};
