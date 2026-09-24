import type { UniformPart } from '../../core/parts';
import { modernNeckAndWordmark, shoulder } from '../parts';

export const SEAHAWKS_JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [
    ...shoulder('navy', 'green'),
    ...modernNeckAndWordmark('white', 'whiteNeck', 'navy', 'white'),
  ],
  number: { fill: 'navy', outline: 'green', outlineWidth: 26 },
};
