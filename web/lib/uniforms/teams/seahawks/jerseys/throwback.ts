import type { UniformPart } from '../../core/parts';
import {
  SEAHAWKS_SHOULDER_NUMBER_LEFT,
  SEAHAWKS_SHOULDER_NUMBER_RIGHT,
  SEAHAWKS_THROWBACK_SLEEVE_BLOCK_LEFT,
  SEAHAWKS_THROWBACK_SLEEVE_BLOCK_RIGHT,
  SEAHAWKS_THROWBACK_SLEEVE_EYE_LEFT,
  SEAHAWKS_THROWBACK_SLEEVE_EYE_RIGHT,
  SEAHAWKS_THROWBACK_SLEEVE_WHITE_LEFT,
  SEAHAWKS_THROWBACK_SLEEVE_WHITE_RIGHT,
} from '../source';
import { modernInsetVCollar } from '../../core/shared';
import { fill } from '../parts';

// Royal body with white numerals, white shoulder numbers, the original hawk on each sleeve and a
// white-green-white V collar. The shared inset V collar gives the white edge with a green inset.
export const SEAHAWKS_JERSEY_THROWBACK: UniformPart = {
  base: 'throwbackRoyal',
  layers: [
    fill('seahawks-shoulder-number-left', 'sleeve-left', SEAHAWKS_SHOULDER_NUMBER_LEFT, 'white'),
    fill('seahawks-shoulder-number-right', 'sleeve-right', SEAHAWKS_SHOULDER_NUMBER_RIGHT, 'white'),
    fill(
      'seahawks-throwback-sleeve-white-left',
      'sleeve-left',
      SEAHAWKS_THROWBACK_SLEEVE_WHITE_LEFT,
      'white'
    ),
    fill(
      'seahawks-throwback-sleeve-white-right',
      'sleeve-right',
      SEAHAWKS_THROWBACK_SLEEVE_WHITE_RIGHT,
      'white'
    ),
    fill(
      'seahawks-throwback-sleeve-block-left',
      'sleeve-left',
      SEAHAWKS_THROWBACK_SLEEVE_BLOCK_LEFT,
      'throwbackGreen'
    ),
    fill(
      'seahawks-throwback-sleeve-block-right',
      'sleeve-right',
      SEAHAWKS_THROWBACK_SLEEVE_BLOCK_RIGHT,
      'throwbackGreen'
    ),
    fill(
      'seahawks-throwback-sleeve-eye-left',
      'sleeve-left',
      SEAHAWKS_THROWBACK_SLEEVE_EYE_LEFT,
      'throwbackGreen'
    ),
    fill(
      'seahawks-throwback-sleeve-eye-right',
      'sleeve-right',
      SEAHAWKS_THROWBACK_SLEEVE_EYE_RIGHT,
      'throwbackGreen'
    ),
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
