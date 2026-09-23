import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_POWDER: UniformPart = {
  base: 'powderBlue',
  layers: parts.bolts('white', 'gold'),
  number: { fill: 'white', outline: 'gold', outlineWidth: 12 },
};
