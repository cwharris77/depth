import type { UniformPart } from '../../core/parts';
import { collar, sleeveBands } from '../parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBands('purple', 'gold'), ...collar('purple', 'gold')],
  number: { fill: 'purple', outline: 'gold', outlineWidth: 14 },
};
