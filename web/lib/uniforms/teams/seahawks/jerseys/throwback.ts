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
import { COLLAR_PATH, fill } from '../parts';

// Royal body with white numerals, white shoulder numbers, the original hawk on each sleeve and a
// white-green-white V collar. The collar is two centred strokes: the wide white one shows as the
// outer and inner keylines around the narrower green one.
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
    {
      id: 'seahawks-throwback-collar-white',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: 20,
    },
    {
      id: 'seahawks-throwback-collar-green',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'throwbackGreen',
      strokeWidth: 12,
    },
  ],
  number: { fill: 'white', outline: 'throwbackRoyal', outlineWidth: 26 },
};
