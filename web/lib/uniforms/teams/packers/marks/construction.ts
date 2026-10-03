// Green Bay's own helmet art, bound to palette keys and emitted exactly as written.
import { PACKERS_G_MARK_LAYERS } from './decal';
import { PACKERS_HELMET_STRIPE_INNER_PATH, PACKERS_HELMET_STRIPE_PATH } from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// The green/white/green crown stripe over the supplied three-colour G. The G's source colours are
// palette keys of their own so the three foreground paints stay distinct from the kit colours.
export const PACKERS_HELMET_DECAL = placed([
  {
    id: 'packers-helmet-stripe',
    surface: 'helmet',
    d: PACKERS_HELMET_STRIPE_PATH,
    clip: true,
    kind: 'fill',
    fill: 'green',
  },
  {
    id: 'packers-helmet-stripe-inner',
    surface: 'helmet',
    d: PACKERS_HELMET_STRIPE_INNER_PATH,
    clip: true,
    kind: 'fill',
    fill: 'white',
  },
  ...PACKERS_G_MARK_LAYERS.map((layer): PartLayer => ({
    ...layer,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
  })),
]);
