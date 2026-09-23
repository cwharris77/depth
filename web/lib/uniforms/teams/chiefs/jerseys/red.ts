import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: parts.sleeveStripes('white', 'gold'),
  number: { fill: 'white', outline: 'gold', outlineWidth: 22 },
};
