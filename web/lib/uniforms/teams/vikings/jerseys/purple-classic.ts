import type { UniformPart } from '../../core/parts';
import { VIKINGS_CLASSIC_COLLAR_PATH } from '../source';
import { collar, sleeveBands } from '../parts';

export const JERSEY_PURPLE_CLASSIC: UniformPart = {
  base: 'purple',
  layers: [
    ...sleeveBands('white', 'gold'),
    ...collar('white', 'gold', VIKINGS_CLASSIC_COLLAR_PATH),
  ],
  number: { fill: 'white', outline: 'gold', outlineWidth: 14 },
};
