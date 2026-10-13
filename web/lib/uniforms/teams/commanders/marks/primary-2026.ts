import { placed } from '../../core/marks';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import { COMMANDERS_W_DECAL } from './construction';

export const COMMANDERS_2026_HELMET = placed([
  ...COMMANDERS_W_DECAL.layers,
  {
    id: 'commanders-2026-crown-white',
    surface: 'helmet',
    kind: 'stroke',
    stroke: 'white',
    strokeWidth: 34,
    d: HELMET_CROWN_STRIPE_PATH,
    clip: true,
  },
  {
    id: 'commanders-2026-crown-gold',
    surface: 'helmet',
    kind: 'fill',
    fill: 'gold',
    d: HELMET_CROWN_STRIPE_PATH,
    clip: true,
  },
]);
