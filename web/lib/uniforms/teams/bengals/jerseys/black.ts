import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: parts.sleeveStripes('orange'),
  number: { fill: 'readable-on-body', outline: 'orange', outlineWidth: 26 },
};
