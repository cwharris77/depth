import type { UniformPart } from '../../core/parts';
import { collar } from '../parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: collar('gold'),
  number: { fill: 'black', outline: 'gold', outlineWidth: 12 },
};
