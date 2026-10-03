// Atlanta's own construction layers, bound to palette keys: the falcon decal, the jersey's
// side-seam piping and the leg stripe.
import {
  FALCONS_DECAL_BODY_PATH,
  FALCONS_DECAL_SILHOUETTE_PATH,
  FALCONS_DECAL_SILVER_PATH,
  FALCONS_DECAL_STREAKS_PATH,
  FALCONS_PANTS_BACKING_LEFT,
  FALCONS_PANTS_BACKING_RIGHT,
  FALCONS_PANTS_STRIPE_LEFT,
  FALCONS_PANTS_STRIPE_RIGHT,
  FALCONS_SIDE_STRIPE_LEFT,
  FALCONS_SIDE_STRIPE_RIGHT,
} from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The falcon on the shell: a silver rim, the white silhouette, the black body, the red streaks.
export const FALCONS_DECAL = placed([
  fill('falcons-decal-silver', 'helmet', FALCONS_DECAL_SILVER_PATH, 'silver'),
  fill('falcons-decal-silhouette', 'helmet', FALCONS_DECAL_SILHOUETTE_PATH, 'white'),
  fill('falcons-decal-body', 'helmet', FALCONS_DECAL_BODY_PATH, 'black'),
  fill('falcons-decal-streaks', 'helmet', FALCONS_DECAL_STREAKS_PATH, 'red'),
]);

// The side-seam piping pair on the jersey body.
export const falconsSideStripes = (color: string) =>
  placed([
    fill('falcons-side-stripe-left', 'jersey', FALCONS_SIDE_STRIPE_LEFT, color),
    fill('falcons-side-stripe-right', 'jersey', FALCONS_SIDE_STRIPE_RIGHT, color),
  ]);

// A black backing frames a red tapered stripe down each leg, stopping at the pant hem.
export const FALCONS_PANTS_STRIPE = placed([
  fill('falcons-pants-backing-left', 'leg-left', FALCONS_PANTS_BACKING_LEFT, 'black'),
  fill('falcons-pants-backing-right', 'leg-right', FALCONS_PANTS_BACKING_RIGHT, 'black'),
  fill('falcons-pants-stripe-left', 'leg-left', FALCONS_PANTS_STRIPE_LEFT, 'red'),
  fill('falcons-pants-stripe-right', 'leg-right', FALCONS_PANTS_STRIPE_RIGHT, 'red'),
]);
