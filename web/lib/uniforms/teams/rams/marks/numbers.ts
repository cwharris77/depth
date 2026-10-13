import type { PatternDef } from '../../core/types';

// Rounded bowls and square left terminals distinguish this numeral from a chamfered block font.
export const RAMS_NUMBER_THREE =
  'M244,582 C243,554 260,539 289,539 C318,539 337,555 337,580 C337,595 330,607 318,614 C333,622 340,637 340,657 C340,683 323,697 295,697 C265,697 246,681 244,655 L244,645 L269,645 L270,656 C271,669 280,676 294,676 C308,676 315,668 315,655 C315,640 307,632 291,632 L280,632 L280,609 L290,609 C305,609 312,599 312,584 C312,569 305,560 292,560 C278,560 270,569 270,582 Z';

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
