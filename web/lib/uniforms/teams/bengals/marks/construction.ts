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
