import type { UniformPart } from '../../core/parts';
import {
  SEAHAWKS_1976_SLEEVE_GREEN_LEFT,
  SEAHAWKS_1976_SLEEVE_GREEN_RIGHT,
  SEAHAWKS_1976_SLEEVE_WHITE_LEFT,
  SEAHAWKS_1976_SLEEVE_WHITE_RIGHT,
} from '../source';
import { COLLAR_PATH, fill } from '../parts';

export const SEAHAWKS_JERSEY_ROYAL_1976: UniformPart = {
  base: 'royal76',
  layers: [
    {
      id: 'generic-collar',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'green76',
      strokeWidth: 8,
    },
    fill(
      'seahawks-1976-sleeve-white-left',
      'sleeve-left',
      SEAHAWKS_1976_SLEEVE_WHITE_LEFT,
      'white'
    ),
    fill(
      'seahawks-1976-sleeve-white-right',
      'sleeve-right',
      SEAHAWKS_1976_SLEEVE_WHITE_RIGHT,
      'white'
    ),
    fill(
      'seahawks-1976-sleeve-green-left',
      'sleeve-left',
      SEAHAWKS_1976_SLEEVE_GREEN_LEFT,
      'green76'
    ),
    fill(
      'seahawks-1976-sleeve-green-right',
      'sleeve-right',
      SEAHAWKS_1976_SLEEVE_GREEN_RIGHT,
      'green76'
    ),
    {
      id: 'seahawks-1976-collar-white',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: 18,
    },
  ],
  number: { fill: 'readable-on-body', outline: 'royal76', outlineWidth: 26 },
};
