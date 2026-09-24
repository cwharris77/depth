import type { UniformPart } from '../../core/parts';
import { modernNeckAndWordmark, shoulder } from '../parts';

// The home construction in Action Green: navy shoulder band, cap and shoulder numbers, navy collar
// feathers, a white wordmark in the band, and navy numerals with a thin white keyline.
export const SEAHAWKS_JERSEY_ACTION_GREEN: UniformPart = {
  base: 'actionGreen',
  layers: [
    ...shoulder('navy', 'navy'),
    ...modernNeckAndWordmark('actionGreen', 'actionGreenNeck', 'navy', 'white'),
  ],
  number: { fill: 'navy', outline: 'white', outlineWidth: 12 },
};
