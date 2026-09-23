import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: parts.bolts('powderBlue', 'gold'),
  number: { fill: 'powderBlue', outline: 'gold', outlineWidth: 12 },
};
