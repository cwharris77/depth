import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: parts.sleeveStripes('red'),
  number: { fill: 'red', outline: 'red', outlineWidth: 10 },
};
