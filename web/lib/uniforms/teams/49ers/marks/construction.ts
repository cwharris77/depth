// San Francisco's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  NINERS_DECAL_FIELD_PATH,
  NINERS_DECAL_GOLD_RING_PATH,
  NINERS_DECAL_LETTERS_PATH,
  NINERS_DECAL_OUTER_RING_PATH,
} from './paths';
import { seatedCrownStripe } from '../../core/shared';
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

// The oval: a black keyline ring, a thin gold ring, the field and white
// letters. The keyline stays black on both the gold and the black shell, so it is its own palette
// colour rather than a shell token.
const oval = [
  fill('niners-decal-ring', NINERS_DECAL_OUTER_RING_PATH, 'decalBlack'),
  fill('niners-decal-gold-ring', NINERS_DECAL_GOLD_RING_PATH, 'gold'),
  fill('niners-decal-field', NINERS_DECAL_FIELD_PATH, 'red'),
  fill('niners-decal-letters', NINERS_DECAL_LETTERS_PATH, 'white'),
];

// The crown stripe: a white centre between two red edges, or the shell showing between the red
// edges on the black helmet.
const crown = (prefix: string, center: string): PartLayer[] =>
  seatedCrownStripe([
    { id: `${prefix}-crown-red-top`, fill: 'red', weight: 4 },
    { id: `${prefix}-crown-center`, fill: center, weight: 9 },
    { id: `${prefix}-crown-red-bottom`, fill: 'red', weight: 4 },
  ]);

export const NINERS_GOLD_DECAL = placed([...crown('niners-helmet', 'white'), ...oval]);

export const NINERS_BLACK_DECAL = placed([...crown('niners-helmet', 'black'), ...oval]);

export const NINERS_THROWBACK_DECAL = placed([
  ...crown('niners-throwback', 'white'),
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
