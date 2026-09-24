import type { UniformPart } from '../../core/parts';
import { SEAHAWKS_SHOULDER_NUMBER_LEFT, SEAHAWKS_SHOULDER_NUMBER_RIGHT } from '../source';
import { modernInsetVCollar } from '../../core/shared';
import { fill } from '../parts';
import { placeMarkOnSleeves } from '../../core/marks';
import { SEAHAWKS_THROWBACK_HAWK } from '../marks/throwback-hawk';

// Royal body with white numerals, white shoulder numbers, the original hawk on each sleeve and a
// white-green-white V collar. The shared inset V collar gives the white edge with a green inset.
export const SEAHAWKS_JERSEY_THROWBACK: UniformPart = {
  base: 'throwbackRoyal',
  layers: [
    fill('seahawks-shoulder-number-left', 'sleeve-left', SEAHAWKS_SHOULDER_NUMBER_LEFT, 'white'),
    fill('seahawks-shoulder-number-right', 'sleeve-right', SEAHAWKS_SHOULDER_NUMBER_RIGHT, 'white'),
    // The royal body disappears into the royal sleeve, so only the head, block and eye are drawn.
    ...placeMarkOnSleeves('seahawks-throwback-sleeve', SEAHAWKS_THROWBACK_HAWK, {
      royal: null,
      white: 'white',
      block: 'throwbackGreen',
      eye: 'throwbackGreen',
    }),
    ...modernInsetVCollar({
      idPrefix: 'seahawks-throwback',
      colors: {
        interior: 'throwbackNeck',
        edge: 'white',
        inset: 'throwbackGreen',
        placket: 'throwbackRoyal',
      },
    }),
  ],
  number: { fill: 'white', outline: 'throwbackRoyal', outlineWidth: 26 },
};
