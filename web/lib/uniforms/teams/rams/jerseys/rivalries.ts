import type { UniformPart } from '../../core/parts';
import { sleeveMark } from '../parts';

export const JERSEY_RIVALRIES: UniformPart = {
  base: 'navy',
  layers: sleeveMark('yellow', 'royal'),
  number: { fill: 'white', outline: 'royal', outlineWidth: 14 },
};
