// Los Angeles' own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  RAMS_DECAL_HORN_PATH,
  RAMS_SLEEVE_BAND_LEFT,
  RAMS_SLEEVE_BAND_RIGHT,
  RAMS_SLEEVE_TAIL_LEFT,
  RAMS_SLEEVE_TAIL_RIGHT,
  RAMS_STRIPE_BAND_LEFT,
  RAMS_STRIPE_BAND_RIGHT,
  RAMS_STRIPE_KEYLINE_LEFT,
  RAMS_STRIPE_KEYLINE_RIGHT,
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

// The shell's horn, one layer with no fill rule: its two subpaths are a union.
export function ramsHelmetHorn(color: string): PlacedMark {
  return placed([fill('rams-decal-horn', 'helmet', RAMS_DECAL_HORN_PATH, color)]);
}

// The sleeve mark: a band that widens toward the hem and a tail splitting off toward the shoulder
// edge, each in its own colour because the tail breaks from the band on one jersey.
export function ramsSleeveMark(band: string, tail: string): PlacedMark {
  return placed([
    fill('rams-sleeve-band-left', 'sleeve-left', RAMS_SLEEVE_BAND_LEFT, band),
    fill('rams-sleeve-band-right', 'sleeve-right', RAMS_SLEEVE_BAND_RIGHT, band),
    fill('rams-sleeve-tail-left', 'sleeve-left', RAMS_SLEEVE_TAIL_LEFT, tail),
    fill('rams-sleeve-tail-right', 'sleeve-right', RAMS_SLEEVE_TAIL_RIGHT, tail),
  ]);
}

// The pant leg stripe: an outer keyline with the inboard band beside it, both ending at the hem.
export function ramsLegStripe(keyline: string, band: string): PlacedMark {
  return placed([
    fill('rams-stripe-keyline-left', 'leg-left', RAMS_STRIPE_KEYLINE_LEFT, keyline),
    fill('rams-stripe-keyline-right', 'leg-right', RAMS_STRIPE_KEYLINE_RIGHT, keyline),
    fill('rams-stripe-band-left', 'leg-left', RAMS_STRIPE_BAND_LEFT, band),
    fill('rams-stripe-band-right', 'leg-right', RAMS_STRIPE_BAND_RIGHT, band),
  ]);
}
