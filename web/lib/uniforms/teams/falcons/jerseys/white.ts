// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sideStripes } from '../parts';

// Away jersey: white body, red side piping, black numerals ringed in red. The black number fill
// is a literal in the flat form (no token supplies it on the away row); here it is the palette.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sideStripes('red'),
  number: { fill: 'black', outline: 'red', outlineWidth: 10 },
};
