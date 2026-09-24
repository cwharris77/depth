import { expandJersey } from '../../core/jersey-spec';
import type { PartLayer, UniformPart } from '../../core/parts';

const spec = expandJersey('chargers-navy', {
  body: 'navy',
  collar: { style: 'inset-v', color: 'navy', outline: true },
  number: { fill: 'white', outline: 'gold', outlineWeight: 'thin' },
});

// The white shoulder bolt sits inside a navy gap and a narrow gold edge.
const boltPaths = {
  left: [
    'M62.3,435.4 L80.8,424.6 L99.2,421.5 L103.9,423.1 L110.8,446.1 L116.2,476.2 L127,545.5 L110,508.5 L89.2,458.5 L86.9,457.7 L76.1,479.3 Z',
    'M99,426 L106.9,448.2 L114.1,490.6 L113.6,499 L91.4,445.7 L87.5,446 L79.9,458.9 L77.4,459.5 L67.9,436.4 L82.2,429.8 L98.7,426.2 Z',
    'M98.2,428.2 L105.3,448.4 L111.9,486.9 L111.4,494.5 L91.3,446.1 L87.7,446.4 L80.8,458.1 L78.5,458.6 L69.9,437.6 L82.9,431.7 L97.9,428.4 Z',
  ],
  right: [
    'M525.7,435.4 L507.2,424.6 L488.8,421.5 L484.1,423.1 L477.2,446.1 L471.8,476.2 L461,545.5 L478,508.5 L498.8,458.5 L501.1,457.7 L511.9,479.3 Z',
    'M489,426 L481.1,448.2 L473.9,490.6 L474.4,499 L496.6,445.7 L500.5,446 L508.1,458.9 L510.6,459.5 L520.1,436.4 L505.8,429.8 L489.3,426.2 Z',
    'M489.8,428.2 L482.7,448.4 L476.1,486.9 L476.6,494.5 L496.7,446.1 L500.3,446.4 L507.2,458.1 L509.5,458.6 L518.1,437.6 L505.1,431.7 L490.1,428.4 Z',
  ],
} as const;

const bolts: PartLayer[] = Object.entries(boltPaths).flatMap(([side, paths]) =>
  paths.map((d, index) => ({
    id: `chargers-navy-bolt-${index}-${side}`,
    surface: `sleeve-${side}` as 'sleeve-left' | 'sleeve-right',
    d,
    clip: true,
    kind: 'fill' as const,
    fill: ['gold', 'navy', 'white'][index],
  }))
);

export const JERSEY_NAVY: UniformPart = {
  ...spec,
  layers: [...bolts, ...spec.layers],
};
