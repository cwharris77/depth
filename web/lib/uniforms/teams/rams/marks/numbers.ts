import type { PatternDef } from '../../core/types';

// Rounded bowls and square left terminals distinguish this numeral from a chamfered block font.
export const RAMS_NUMBER_THREE =
  'M234,574.8 C232.8,541.2 253.2,523.2 288,523.2 C322.8,523.2 345.6,542.4 345.6,572.4 C345.6,590.4 337.2,604.8 322.8,613.2 C340.8,622.8 349.2,640.8 349.2,664.8 C349.2,696 328.8,712.8 295.2,712.8 C259.2,712.8 236.4,693.6 234,662.4 L234,650.4 L264,650.4 L265.2,663.6 C266.4,679.2 277.2,687.6 294,687.6 C310.8,687.6 319.2,678 319.2,662.4 C319.2,644.4 309.6,634.8 290.4,634.8 L277.2,634.8 L277.2,607.2 L289.2,607.2 C307.2,607.2 315.6,595.2 315.6,577.2 C315.6,559.2 307.2,548.4 291.6,548.4 C274.8,548.4 265.2,559.2 265.2,574.8 Z';

export const RAMS_NUMBER_PATTERNS: Record<string, PatternDef> = {
  'rams-number-fade': {
    width: 588,
    height: 820,
    gradient: {
      x1: 294,
      y1: 523.2,
      x2: 294,
      y2: 709.2,
      stops: [
        { offset: 0, color: 'yellow' },
        { offset: 0.3, color: '#FFF185' },
        { offset: 0.72, color: 'white' },
        { offset: 1, color: 'white' },
      ],
    },
    shapes: [{ d: 'M0,0 H588 V820 H0 Z', fill: 'yellow' }],
  },
};
