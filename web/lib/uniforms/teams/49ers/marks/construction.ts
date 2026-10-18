// San Francisco's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  NINERS_DECAL_FIELD_PATH,
  NINERS_DECAL_GOLD_RING_PATH,
  NINERS_DECAL_LETTERS_PATH,
  NINERS_DECAL_OUTER_RING_PATH,
} from './paths';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const fill = (id: string, d: string, color: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The crown stripe and the oval: a black keyline ring, a thin gold ring, the field and white
// letters. The keyline stays black on both the gold and the black shell, so it is its own palette
// colour rather than a shell token. The stripe and the field share one colour.
const oval = [
  fill('niners-decal-ring', NINERS_DECAL_OUTER_RING_PATH, 'decalBlack'),
  fill('niners-decal-gold-ring', NINERS_DECAL_GOLD_RING_PATH, 'gold'),
  fill('niners-decal-field', NINERS_DECAL_FIELD_PATH, 'red'),
  fill('niners-decal-letters', NINERS_DECAL_LETTERS_PATH, 'white'),
];

const edge = (id: string, d: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'stroke',
  stroke: 'red',
  strokeWidth: 4,
});

const crownTop =
  'M236,127 L252,115 L302,91 L334,79 L374,69 L402,65 L455,65 L509,73 L547,85 L593,109 L631,137';
const crownBottom =
  'M242,146 L257,133 L305,108 L336,95 L375,84 L402,79 L455,78 L508,85 L545,96 L589,119 L625,146';

export const NINERS_GOLD_DECAL = placed([
  fill('niners-helmet-crown-center', HELMET_CROWN_STRIPE_PATH, 'white'),
  edge('niners-helmet-crown-red-top', crownTop),
  edge('niners-helmet-crown-red-bottom', crownBottom),
  ...oval,
]);

export const NINERS_BLACK_DECAL = placed([
  edge('niners-helmet-crown-red-top', crownTop),
  edge('niners-helmet-crown-red-bottom', crownBottom),
  ...oval,
]);

export const NINERS_THROWBACK_DECAL = placed([
  fill('niners-throwback-crown-center', HELMET_CROWN_STRIPE_PATH, 'white'),
  edge('niners-throwback-crown-red-top', crownTop),
  edge('niners-throwback-crown-red-bottom', crownBottom),
  fill('niners-throwback-decal-ring', NINERS_DECAL_OUTER_RING_PATH, 'decalBlack'),
  fill('niners-throwback-decal-field', NINERS_DECAL_FIELD_PATH, 'red'),
  {
    id: 'niners-throwback-letters-outline',
    surface: 'helmet',
    clip: true,
    kind: 'stroke',
    stroke: 'decalBlack',
    strokeWidth: 8,
    d: NINERS_DECAL_LETTERS_PATH,
  },
  fill('niners-throwback-decal-letters', NINERS_DECAL_LETTERS_PATH, 'white'),
]);
