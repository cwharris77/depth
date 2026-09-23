import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_CREAMSICLE: UniformPart = {
  base: 'creamOrange',
  layers: parts.creamCuff('crimson', 'white'),
  number: { fill: 'white', outline: 'crimson', outlineWidth: 14 },
};
