import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: parts.sleeveStripes('red'),
  number: { fill: 'red', outline: 'gold', outlineWidth: 14 },
};
