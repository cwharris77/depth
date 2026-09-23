import type { UniformPart } from '../../core/parts';
import { shoulderBands } from '../parts';

export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: shoulderBands('red', 'white'),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};
