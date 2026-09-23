import type { UniformPart } from '../../core/parts';
import { shoulders } from '../parts';

export const JERSEY_LIGHT_BLUE: UniformPart = {
  base: 'lightBlue',
  layers: shoulders('red'),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};
