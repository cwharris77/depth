import type { UniformPart } from '../../core/parts';
import { sleeveMark } from '../parts';

export const JERSEY_BONE: UniformPart = {
  base: 'bone',
  layers: sleeveMark('gold', 'gold'),
  number: { fill: 'royal', outline: 'gold', outlineWidth: 14 },
};
