import type { UniformPart } from '../../core/parts';
import { sleeveMark } from '../parts';

export const JERSEY_ROYAL: UniformPart = {
  base: 'royal',
  layers: sleeveMark('gold', 'gold'),
  number: { fill: 'gold', outline: 'white', outlineWidth: 14 },
};
