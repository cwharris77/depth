import type { UniformPart } from '../../core/parts';
import { collar } from '../parts';

export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: collar('gold'),
  number: { fill: 'gold', outline: 'white', outlineWidth: 12 },
};
