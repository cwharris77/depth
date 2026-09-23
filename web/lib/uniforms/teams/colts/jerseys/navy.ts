import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: parts.shoulderBars('white'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
