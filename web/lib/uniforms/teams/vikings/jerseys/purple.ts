import type { UniformPart } from '../../core/parts';
import { collar, sleeveBands } from '../parts';

export const JERSEY_PURPLE: UniformPart = {
  base: 'purple',
  layers: [...sleeveBands('white', 'gold'), ...collar('white', 'gold')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 14 },
};
