// Buffalo's helmet decals, bound to palette keys. Each export is a placed mark, emitted exactly
// as written.
import { BILLS_HELMET_DECAL_BUFFALO_PATH, BILLS_HELMET_DECAL_STRIPE_PATH } from './decal';
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

const outline = (id: string, d: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'stroke',
  stroke: 'navy',
  strokeWidth: 3,
  lineCap: 'round',
});

// The navy buffalo with the red diagonal stripe, shared by home and away.
export const BILLS_BUFFALO_DECAL = placed([
  fill('bills-helmet-buffalo', BILLS_HELMET_DECAL_BUFFALO_PATH, 'navy'),
  fill('bills-helmet-stripe', BILLS_HELMET_DECAL_STRIPE_PATH, 'red'),
]);

// Rivalries' tone-on-tone treatment: silver buffalo and light-silver stripe, each outlined in navy.
export const BILLS_ICE_DECAL = placed([
  fill('bills-helmet-buffalo', BILLS_HELMET_DECAL_BUFFALO_PATH, 'iceSilver'),
  outline('bills-helmet-buffalo-outline', BILLS_HELMET_DECAL_BUFFALO_PATH),
  fill('bills-helmet-stripe', BILLS_HELMET_DECAL_STRIPE_PATH, 'iceSilverLight'),
  outline('bills-helmet-stripe-outline', BILLS_HELMET_DECAL_STRIPE_PATH),
]);

// The Charge helmet's streak: a red band across the side of the shell from the back, with a thin
// white edge, ending in a slanted cut ahead of the ear hole. The shell clip trims its back end.
const CHARGE_EDGE_PATH = 'M120,276 L490,276 L455,384 L120,384 Z';
const CHARGE_STREAK_PATH = 'M120,284 L478,284 L449,376 L120,376 Z';

export const BILLS_CHARGE_DECAL = placed([
  fill('bills-charge-edge', CHARGE_EDGE_PATH, 'white'),
  fill('bills-charge-streak', CHARGE_STREAK_PATH, 'red'),
]);
