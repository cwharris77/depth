import type { UniformPart } from '../../core/parts';
import { shoulderBars, sleeveBands } from '../parts';

export const JERSEY_PURPLE: UniformPart = {
  base: 'purple',
  layers: [...shoulderBars('white'), ...sleeveBands('black')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};
