import { PACKERS_G_MARK_LAYERS } from './decal';
import { PACKERS_HELMET_STRIPE_INNER_PATH, PACKERS_HELMET_STRIPE_PATH } from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

export const PACKERS_RIVALRIES_HELMET = placed([
  {
    id: 'packers-rivalries-helmet-stripe',
    surface: 'helmet',
    d: PACKERS_HELMET_STRIPE_PATH,
    clip: true,
    kind: 'fill',
    fill: 'rivalriesGreen',
  },
  {
    id: 'packers-rivalries-helmet-gold-stripe',
    surface: 'helmet',
    d: PACKERS_HELMET_STRIPE_INNER_PATH,
    clip: true,
    kind: 'fill',
    fill: 'rivalriesGold',
  },
  ...PACKERS_G_MARK_LAYERS.map((layer): PartLayer => ({
    ...layer,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
  })),
]);
