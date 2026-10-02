// Indianapolis' own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import { COLTS_DECAL_HORSESHOE_NAVY_PATH, COLTS_DECAL_HORSESHOE_WHITE_PATH } from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const decal = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
});

// The horseshoe is a single navy band with its seven isolated rivets restored on top in white.
export const COLTS_HORSESHOE_DECAL = placed([
  decal('colts-helmet-horseshoe-band', COLTS_DECAL_HORSESHOE_NAVY_PATH, 'navy'),
  decal('colts-helmet-horseshoe-rivets', COLTS_DECAL_HORSESHOE_WHITE_PATH, 'white'),
]);
