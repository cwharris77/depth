import type { PartLayer } from '../../core/parts';
export const lionsCrown = (outer: string, inner: string): PartLayer[] => [
  {
    id: 'lions-crown-outer',
    surface: 'helmet',
    kind: 'fill',
    fill: outer,
    clip: true,
    d: 'M236,127 L252,115 L302,91 L334,79 L374,69 L402,65 L455,65 L509,73 L547,85 L593,109 L631,137 L619,155 L585,129 L544,107 L507,95 L455,87 L402,87 L376,91 L337,101 L306,113 L258,137 L244,150 Z',
  },
  {
    id: 'lions-crown-inner',
    surface: 'helmet',
    kind: 'fill',
    fill: inner,
    clip: true,
    d: 'M243,133 L255,122 L304,98 L336,86 L375,76 L402,72 L455,72 L509,80 L547,92 L592,116 L627,144 L620,150 L586,124 L545,100 L508,88 L455,80 L402,80 L376,84 L338,94 L307,106 L259,130 L246,141 Z',
  },
];
