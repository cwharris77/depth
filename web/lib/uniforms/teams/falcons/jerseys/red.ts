// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sideStripes } from '../parts';

// Red alternate jersey: red body, white side piping, white numerals ringed in black. Inferred
// construction (no red kit in the 2025 composite), same caveat as the flat form.
export const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: sideStripes('white'),
  number: { fill: 'white', outline: 'black', outlineWidth: 10 },
};
