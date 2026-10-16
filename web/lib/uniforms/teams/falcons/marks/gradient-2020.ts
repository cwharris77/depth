import { placed } from '../../core/marks';
import type { PatternDef } from '../../core/types';
// Red shoulders fade through the torso into a black hem.
export const FALCONS_GRADIENT_PATTERNS: Record<string, PatternDef> = {
  'falcons-2020-rise-up': {
    width: 588,
    height: 820,
    gradient: {
      x1: 294,
      y1: 500,
      x2: 294,
      y2: 745,
      stops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'black' },
      ],
    },
    shapes: [{ d: 'M0,0 H588 V820 H0 Z', fill: 'red' }],
  },
};
export const FALCONS_GRADIENT_FIELD = placed([
  {
    id: 'falcons-2020-gradient',
    surface: 'jersey',
    kind: 'fill',
    fill: 'pattern:falcons-2020-rise-up',
    d: 'M0,372 H588 V820 H0 Z',
    clip: true,
  },
]);
