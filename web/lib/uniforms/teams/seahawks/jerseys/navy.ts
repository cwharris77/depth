import type { UniformPart } from '../../core/parts';
import { modernNeckAndWordmark, shoulder } from '../parts';

export const SEAHAWKS_JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    ...shoulder('wolfGrey', 'green'),
    ...modernNeckAndWordmark('navy', 'navyNeck', 'green', 'navy'),
  ],
  number: { fill: 'wolfGrey', outline: 'green', outlineWidth: 26 },
};
