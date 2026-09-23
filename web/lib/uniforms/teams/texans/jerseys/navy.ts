import type { UniformPart } from '../../core/parts';
import { collar } from '../parts';

export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: collar(),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};
