import type { UniformPart } from '../../core/parts';
import { shoulderBands } from '../parts';

export const JERSEY_PAT: UniformPart = {
  base: 'patRed',
  layers: shoulderBands('white', 'rivalNavy'),
  number: { fill: 'white', outline: 'rivalNavy', outlineWidth: 14 },
};
