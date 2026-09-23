import type { UniformPart } from '../../core/parts';
import { shoulderBars, sleeveBands } from '../parts';

export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...shoulderBars('white'), ...sleeveBands('purple')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};
