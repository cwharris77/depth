// Los Angeles' own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  RAMS_DECAL_HORN_PATH,
  RAMS_CAPPED_HORN_BAND_LEFT,
  RAMS_CAPPED_HORN_BAND_RIGHT,
  RAMS_CAPPED_HORN_SPLIT_LEFT,
  RAMS_CAPPED_HORN_SPLIT_RIGHT,
  RAMS_AWAY_HORN_SPLIT_LEFT,
  RAMS_AWAY_HORN_SPLIT_RIGHT,
  RAMS_RIVALRIES_HORN_FRONT_LEFT,
  RAMS_RIVALRIES_HORN_FRONT_RIGHT,
  RAMS_RIVALRIES_BLUE_PANEL_LEFT,
  RAMS_RIVALRIES_BLUE_PANEL_RIGHT,
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

// The 2020 cap applies its horn as a narrow band with a small outer split.
export function ramsCappedSleeveHorn(
  band: string,
  split: string,
  outer: 'tip' | 'panel' = 'tip'
): PlacedMark {
  return placed([
    ...(outer === 'panel'
      ? [
          fill('rams-capped-horn-outer-left', 'sleeve-left', RAMS_AWAY_HORN_SPLIT_LEFT, split),
          fill('rams-capped-horn-outer-right', 'sleeve-right', RAMS_AWAY_HORN_SPLIT_RIGHT, split),
        ]
      : []),
    fill('rams-capped-horn-band-left', 'sleeve-left', RAMS_CAPPED_HORN_BAND_LEFT, band),
    fill('rams-capped-horn-band-right', 'sleeve-right', RAMS_CAPPED_HORN_BAND_RIGHT, band),
    fill(
      'rams-capped-horn-split-left',
      'sleeve-left',
      RAMS_CAPPED_HORN_SPLIT_LEFT,
      outer === 'panel' ? band : split
    ),
    fill(
      'rams-capped-horn-split-right',
      'sleeve-right',
      RAMS_CAPPED_HORN_SPLIT_RIGHT,
      outer === 'panel' ? band : split
    ),
  ]);
}

// The front-facing portion of the horn tapers down beside the blue sleeve panel.
export function ramsRivalriesSleeveHorn(horn: string, panel: string): PlacedMark {
  return placed([
    fill('rams-rivalries-horn-panel-left', 'sleeve-left', RAMS_RIVALRIES_BLUE_PANEL_LEFT, panel),
    fill('rams-rivalries-horn-panel-right', 'sleeve-right', RAMS_RIVALRIES_BLUE_PANEL_RIGHT, panel),
    fill('rams-rivalries-horn-front-left', 'sleeve-left', RAMS_RIVALRIES_HORN_FRONT_LEFT, horn),
    fill('rams-rivalries-horn-front-right', 'sleeve-right', RAMS_RIVALRIES_HORN_FRONT_RIGHT, horn),
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
