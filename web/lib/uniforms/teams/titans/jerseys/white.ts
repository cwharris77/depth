import type { UniformPart } from '../../core/parts';
import { shoulders } from '../parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: shoulders('navy'),
  number: { fill: 'navy', outline: 'white', outlineWidth: 14 },
};
