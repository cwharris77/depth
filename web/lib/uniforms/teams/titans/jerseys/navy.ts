import type { UniformPart } from '../../core/parts';
import { shoulders } from '../parts';

export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: shoulders('navy'),
  number: { fill: 'navy', outline: 'white', outlineWidth: 14 },
};
