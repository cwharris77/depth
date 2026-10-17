import type { PatternDef } from '../../core/types';

// Triangle perforations reveal the jersey colour beneath the numeral.
export const BRONCOS_NUMBER_PATTERNS: Record<string, PatternDef> = {
  'broncos-number-white': {
    width: 8,
    height: 8,
    shapes: [
      { d: 'M0,0 H8 V8 H0 Z', fill: 'white' },
      { d: 'M3,3 L5,3 L4,5 Z', fill: 'orange' },
    ],
  },
  'broncos-number-navy': {
    width: 8,
    height: 8,
    shapes: [
      { d: 'M0,0 H8 V8 H0 Z', fill: 'navy' },
      { d: 'M3,5 L5,5 L4,3 Z', fill: 'white' },
    ],
  },
};

// A flat top bar with a short tick at its left end, a diagonal to the waist and a rounded lower bowl.
export const BRONCOS_NUMBER_THREE =
  'M243,539 L346,539 L346,560 L312,598 L322,598 Q346.8,598 346.8,622 L346.8,668 Q346.8,694 322,694 L266,694 Q241.2,694 241.2,668 L241.2,646 L269,646 L269,662 Q269,670 277,670 L310,670 Q318,670 318,662 L318,630 Q318,622 310,622 L278,622 L278,600 L311,563 L269,563 L269,578 L243,578 Z';

// A medium-weight traditional block numeral with chamfered corners.
export const BRONCOS_BLOCK_NUMBER_THREE =
  'M258,539 L330,539 L344,553 L344,608.5 L336,616.5 L344,624.5 L344,680 L330,694 L258,694 L244,680 L244,649 L275,649 L275,665 L313,665 L313,628.5 L280,628.5 L280,604.5 L313,604.5 L313,568 L275,568 L275,584 L244,584 L244,553 Z';
