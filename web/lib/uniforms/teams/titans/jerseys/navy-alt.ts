import type { UniformPart } from '../../core/parts';
import { shoulders } from '../parts';

export const JERSEY_NAVY_ALT: UniformPart = {
  base: 'navy',
  layers: shoulders('lightBlue'),
  number: { fill: 'white', outline: 'lightBlue', outlineWidth: 14 },
};
