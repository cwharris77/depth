import {
  DOLPHINS_COLLAR_PATH,
  DOLPHINS_COLLAR_WIDTH,
  DOLPHINS_SLASH_LEFT,
  DOLPHINS_SLASH_RIGHT,
  DOLPHINS_SLASH_WIDTH,
  DOLPHINS_WEDGE_LEFT,
  DOLPHINS_WEDGE_RIGHT,
} from '../source';
// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';

// Navy rivalries jersey (J3): navy body, teal wedge + orange slash + orange collar V, teal numerals.
export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    {
      id: 'dolphins-wedge-left',
      surface: 'sleeve-left',
      d: DOLPHINS_WEDGE_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'teal',
    },
    {
      id: 'dolphins-wedge-right',
      surface: 'sleeve-right',
      d: DOLPHINS_WEDGE_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'teal',
    },
    {
      id: 'dolphins-slash-left',
      surface: 'sleeve-left',
      d: DOLPHINS_SLASH_LEFT,
      clip: true,
      kind: 'stroke',
      stroke: 'orange',
      strokeWidth: DOLPHINS_SLASH_WIDTH,
    },
    {
      id: 'dolphins-slash-right',
      surface: 'sleeve-right',
      d: DOLPHINS_SLASH_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke: 'orange',
      strokeWidth: DOLPHINS_SLASH_WIDTH,
    },
    {
      id: 'dolphins-collar',
      surface: 'collar',
      d: DOLPHINS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'orange',
      strokeWidth: DOLPHINS_COLLAR_WIDTH,
    },
  ],
  number: { fill: 'teal', outline: 'teal', outlineWidth: 10 },
};
