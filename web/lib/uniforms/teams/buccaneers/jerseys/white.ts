import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...cuff('pewter'), ...collar('pewter')],
  number: { fill: 'red', outline: 'pewter', outlineWidth: 14 },
};
