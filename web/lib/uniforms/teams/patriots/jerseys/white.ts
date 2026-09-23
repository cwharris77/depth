import type { UniformPart } from '../../core/parts';
import { shoulderBands } from '../parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: shoulderBands('red', 'navy'),
  number: { fill: 'navy', outline: 'red', outlineWidth: 14 },
};
