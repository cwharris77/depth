import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_WHITE_TIGER: UniformPart = {
  base: 'white',
  layers: parts.sleeveStripes('black'),
  number: { fill: 'readable-on-body', outline: 'black', outlineWidth: 26 },
};
