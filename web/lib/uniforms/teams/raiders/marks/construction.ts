// Las Vegas' own art, bound to palette keys and emitted exactly as written: the helmet shield with
// its keyline, wordmark, crossed sabres, helmeted face and interior shading, in source paint order.
import { RAIDERS_DECAL_PATHS } from './decal';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

export const RAIDERS_HELMET_DECAL = placed(
  RAIDERS_DECAL_PATHS.map(({ d, fill }, index): PartLayer => ({
    id: `raiders-decal-svg-${String(index + 1).padStart(2, '0')}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);
