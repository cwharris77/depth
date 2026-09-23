import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_RIVALRIES: UniformPart = {
  base: 'cream',
  layers: parts.cardinalsJerseyDetails('rivalries'),
  number: { fill: 'rivalRed', outline: 'rivalOrange', outlineWidth: 5 },
};
