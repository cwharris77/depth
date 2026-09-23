import { collar, cuff } from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: [...cuff('pewter'), ...collar('pewter')],
  number: { fill: 'white', outline: 'orange', outlineWidth: 14 },
};
