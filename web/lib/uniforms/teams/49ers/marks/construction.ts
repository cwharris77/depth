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
export const NINERS_OVAL_DECAL_RED = placed([
  fill('niners-helmet-crown-stripe', HELMET_CROWN_STRIPE_PATH, 'red'),
  fill('niners-decal-ring', NINERS_DECAL_OUTER_RING_PATH, 'decalBlack'),
  fill('niners-decal-gold-ring', NINERS_DECAL_GOLD_RING_PATH, 'gold'),
  fill('niners-decal-field', NINERS_DECAL_FIELD_PATH, 'red'),
  fill('niners-decal-letters', NINERS_DECAL_LETTERS_PATH, 'white'),
]);
