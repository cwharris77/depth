import type { PartLayer } from '../../core/parts';
// The 2017 shell's two-blue, silver-centred stripe, set a little below the shell's top rim so it
// rides on the crown curve instead of the silhouette edge.
export const lionsCrown = (outer: string, inner: string): PartLayer[] => [
  {
    id: 'lions-crown-outer',
    surface: 'helmet',
    kind: 'fill',
    fill: outer,
    clip: true,
    d: 'M236,137 L252,125 L302,101 L334,89 L374,79 L402,75 L455,75 L509,83 L547,95 L593,119 L631,147 L619,165 L585,139 L544,117 L507,105 L455,97 L402,97 L376,101 L337,111 L306,123 L258,147 L244,160 Z',
  },
  {
    id: 'lions-crown-inner',
    surface: 'helmet',
    kind: 'fill',
    fill: inner,
    clip: true,
    d: 'M243,143 L255,132 L304,108 L336,96 L375,86 L402,82 L455,82 L509,90 L547,102 L592,126 L627,154 L620,160 L586,134 L545,110 L508,98 L455,90 L402,90 L376,94 L338,104 L307,116 L259,140 L246,151 Z',
  },
];
