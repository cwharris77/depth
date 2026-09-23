import type { UniformPart } from '../../core/parts';
import { fromGeneric } from '../../core/parts';
import { shoulder } from '../parts';

export const SEAHAWKS_JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [...shoulder('wolfGrey', 'green'), fromGeneric('generic-collar', 'green')],
  number: { fill: 'wolfGrey', outline: 'green', outlineWidth: 26 },
};
