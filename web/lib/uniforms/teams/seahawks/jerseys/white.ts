import type { UniformPart } from '../../core/parts';
import { fromGeneric } from '../../core/parts';
import { fill, shoulder } from '../parts';

export const SEAHAWKS_JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulder('navy', 'green'), fromGeneric('generic-collar', 'navy')],
  number: { fill: 'navy', outline: 'green', outlineWidth: 26 },
};
