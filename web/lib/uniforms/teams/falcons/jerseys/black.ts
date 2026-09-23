// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sideStripes } from '../parts';

// Home jersey: black body, red side piping, white numerals ringed in red (thin 10px keyline).
export const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: sideStripes('red'),
  number: { fill: 'white', outline: 'red', outlineWidth: 10 },
};
