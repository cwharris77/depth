import type { UniformPart } from '../../core/parts';
import { shoulderBars, sleeveBands } from '../parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulderBars('purple'), ...sleeveBands('black')],
  number: { fill: 'purple', outline: 'gold', outlineWidth: 16 },
};
