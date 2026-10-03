import type { UniformPart } from '../../core/parts';
import { shoulders } from '../parts';

export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: shoulders('navy'),
  number: { fill: 'white', outline: 'lightBlue', outlineWidth: 14 },
};
