// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { COLLAR_PATH, sleeveStripes } from '../parts';

// The 1980s throwback jersey: royal body, red/white/red cuff stripes, a red-over-white collar,
// white numerals keylined red.
export const JERSEY_THROWBACK: UniformPart = {
  base: 'royal',
  layers: [
    ...sleeveStripes(
      GIANTS_THROWBACK_STRIPE_BANDS,
      GIANTS_THROWBACK_SLEEVE_X_LEFT,
      GIANTS_THROWBACK_SLEEVE_X_RIGHT,
      ['red', 'white', 'red']
    ),
    {
      id: 'giants-collar-outer',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'red',
      strokeWidth: GIANTS_COLLAR_OUTER_WIDTH,
    },
    {
      id: 'giants-collar-core',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: GIANTS_COLLAR_CORE_WIDTH,
    },
  ],
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};
