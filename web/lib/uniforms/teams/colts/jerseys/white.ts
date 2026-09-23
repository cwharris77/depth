import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: parts.shoulderBars('navy'),
  number: { fill: 'navy', outline: 'navy', outlineWidth: 10 },
};
