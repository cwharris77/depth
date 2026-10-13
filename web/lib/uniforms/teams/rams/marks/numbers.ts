import type { PatternDef } from '../../core/types';

// The narrow numeral pair has a short upper flag and softly rounded stem corners.
export const RAMS_NUMBER_ELEVEN =
  'M239,539 H276 Q280,539 280,543 V690 Q280,694 276,694 H259 Q255,694 255,690 V560 H239 Z M307,539 H344 Q348,539 348,543 V690 Q348,694 344,694 H327 Q323,694 323,690 V560 H307 Z';

export const RAMS_NUMBER_PATTERNS: Record<string, PatternDef> = {
  'rams-number-fade': {
    width: 588,
    height: 820,
    gradient: {
      x1: 294,
      y1: 539,
      x2: 294,
      y2: 694,
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
