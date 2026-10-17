// Cincinnati's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  BENGALS_HELMET_STRIPE_PATH,
  BENGALS_PANTS_KNEE_ACCENT_LEFT,
  BENGALS_PANTS_KNEE_ACCENT_RIGHT,
  BENGALS_SLEEVE_STRIPE_PATH_LEFT,
  BENGALS_SLEEVE_STRIPE_PATH_RIGHT,
} from './paths';
import { placed, type PlacedMark } from '../../core/marks';
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

// The black tiger stripes across the orange shell.
export const BENGALS_HELMET_DECAL = placed([
  fill('bengals-helmet-stripes', 'helmet', BENGALS_HELMET_STRIPE_PATH, 'black'),
]);

// The tiger-stripe sleeve caps, left sleeve then right.
export function bengalsSleeveTigers(color: string): PlacedMark {
  return placed([
    fill('bengals-sleeve-tiger-left', 'sleeve-left', BENGALS_SLEEVE_STRIPE_PATH_LEFT, color),
    fill('bengals-sleeve-tiger-right', 'sleeve-right', BENGALS_SLEEVE_STRIPE_PATH_RIGHT, color),
  ]);
}

// The small tiger claw on the outer knee of each leg.
export function bengalsKneeClaws(color: string): PlacedMark {
  return placed([
    fill('bengals-knee-claw-left', 'leg-left', BENGALS_PANTS_KNEE_ACCENT_LEFT, color),
    fill('bengals-knee-claw-right', 'leg-right', BENGALS_PANTS_KNEE_ACCENT_RIGHT, color),
  ]);
}

export const BENGALS_COLOR_RUSH_SLEEVES = placed([
  fill(
    'bengals-color-rush-cap-left',
    'sleeve-left',
    'M20,458 Q65,430 123,458 L140,491 L140,582 L20,582 Z',
    'black'
  ),
  fill(
    'bengals-color-rush-cap-right',
    'sleeve-right',
    'M568.0,458 Q523.0,430 465.0,458 L448.0,491 L448.0,582 L568.0,582 Z',
    'black'
  ),
  fill(
    'bengals-color-rush-stripe-top-left',
    'sleeve-left',
    'M22,449 Q66,441 108,464 Q117,473 121,491 Q101,472 75,470 Q44,463 22,475 Z',
    'white'
  ),
  fill(
    'bengals-color-rush-stripe-top-right',
    'sleeve-right',
    'M566.0,449 Q522.0,441 480.0,464 Q471.0,473 467.0,491 Q487.0,472 513.0,470 Q544.0,463 566.0,475 Z',
    'white'
  ),
  fill(
    'bengals-color-rush-stripe-middle-left',
    'sleeve-left',
    'M22,477 Q57,480 88,501 Q104,511 109,533 Q89,516 65,511 Q39,506 22,491 Z',
    'white'
  ),
  fill(
    'bengals-color-rush-stripe-middle-right',
    'sleeve-right',
    'M566.0,477 Q531.0,480 500.0,501 Q484.0,511 479.0,533 Q499.0,516 523.0,511 Q549.0,506 566.0,491 Z',
    'white'
  ),
  fill(
    'bengals-color-rush-stripe-lower-left',
    'sleeve-left',
    'M22,515 Q43,523 65,534 Q80,544 83,560 Q61,551 45,551 Q29,545 22,539 Z',
    'white'
  ),
  fill(
    'bengals-color-rush-stripe-lower-right',
    'sleeve-right',
    'M566.0,515 Q545.0,523 523.0,534 Q508.0,544 505.0,560 Q527.0,551 543.0,551 Q559.0,545 566.0,539 Z',
    'white'
  ),
]);
