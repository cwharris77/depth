import type { PatternDef } from '../../core/types';

// The modern numerals use a small tonal feather repeat; Rivalries uses repeating twelves.
export const SEAHAWKS_NUMBER_PATTERNS: Record<string, PatternDef> = {
  'seahawks-feathers-grey': {
    width: 8,
    height: 10,
    shapes: [
      { d: 'M0,0 H8 V10 H0 Z', fill: 'wolfGrey' },
      { d: 'M1,1 L4,3 L7,1 L7,7 L4,9 L1,7 Z', fill: 'numberFeatherGrey' },
    ],
  },
  'seahawks-feathers-navy': {
    width: 8,
    height: 10,
    shapes: [
      { d: 'M0,0 H8 V10 H0 Z', fill: 'navy' },
      { d: 'M1,1 L4,3 L7,1 L7,7 L4,9 L1,7 Z', fill: 'numberFeatherNavy' },
    ],
  },
  'seahawks-twelves': {
    width: 12,
    height: 12,
    shapes: [
      { d: 'M0,0 H12 V12 H0 Z', fill: 'rivalriesJerseyOlive' },
      {
        d: 'M1,3 L3,2 L4,2 L4,9 L2.5,9 L2.5,4 L1,4 Z M6,3 L7,2 L10,2 L11,3 L11,5 L8,8 L11,8 L11,9 L6,9 L6,8 L9.5,4.5 L9.5,3.5 L7.5,3.5 L7.5,5 L6,5 Z',
        fill: 'rivalriesJerseyGreen',
      },
    ],
  },
};
