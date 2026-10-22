import { placed } from '../../core/marks';
import { COMMANDERS_W_DECAL } from './construction';

// The white/gold/white centre stripe, set below the shell's top rim so it rides on the crown curve
// inside the silhouette. The gold centre is inset from both edges of the white band by about a third
// of its thickness. Raw helmet coordinates.
const CROWN_OUTER_PATH =
  'M236,137 L252,125 L302,101 L334,89 L374,79 L402,75 L455,75 L509,83 L547,95 L593,119 L631,147 L619,165 L585,139 L544,117 L507,105 L455,97 L402,97 L376,101 L337,111 L306,123 L258,147 L244,160 Z';
const CROWN_INNER_PATH =
  'M243,143 L255,132 L304,108 L336,96 L375,86 L402,82 L455,82 L509,90 L547,102 L592,126 L627,154 L620,160 L586,134 L545,110 L508,98 L455,90 L402,90 L376,94 L338,104 L307,116 L259,140 L246,151 Z';

export const COMMANDERS_2026_HELMET = placed([
  ...COMMANDERS_W_DECAL.layers,
  {
    id: 'commanders-2026-crown-white',
    surface: 'helmet',
    kind: 'fill',
    fill: 'white',
    d: CROWN_OUTER_PATH,
    clip: true,
  },
  {
    id: 'commanders-2026-crown-gold',
    surface: 'helmet',
    kind: 'fill',
    fill: 'gold',
    d: CROWN_INNER_PATH,
    clip: true,
  },
]);
