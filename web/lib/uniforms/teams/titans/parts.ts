// Tennessee authored as composable parts. Geometry is imported from titans.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The four kits resolve to two helmets: the navy shell wearing the flaming-T (home, away, navy-alt
// share it) and the oilers throwback.s light-blue shell (no decal — its mark is a different logo with
// no figure on the sheet). The silver shoulder yoke is one construction in four colorways: the
// yoke itself is always the silver literal, and the navy bar inside it is the kit's navy. The
// bodies/pants differ as home navy/white, away white/navy, oilers light-blue/light-blue, navy-alt
// navy/navy.
//
// NOTE: the stored palettes predate the 2025 rebrand (see titans.ts) — only `away` can be
// verified against a figure. This migration preserves the existing render; it does not re-derive
// the token assignments.

import {
  TITANS_BAR_LEFT,
  TITANS_BAR_RIGHT,
  TITANS_DECAL_PATHS,
  TITANS_SILVER,
  TITANS_YOKE_LEFT,
  TITANS_YOKE_RIGHT,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

// The silver shoulder yoke with the navy bar over it — the same construction in every kit, with
// only the bar color differing (which the jersey supplies).
export function shoulders(bar: string): PartLayer[] {
  const shapes: [string, UniformSurface, string, string][] = [
    ['titans-yoke-left', 'sleeve-left', TITANS_YOKE_LEFT, 'silver'],
    ['titans-yoke-right', 'sleeve-right', TITANS_YOKE_RIGHT, 'silver'],
    ['titans-bar-left', 'sleeve-left', TITANS_BAR_LEFT, bar],
    ['titans-bar-right', 'sleeve-right', TITANS_BAR_RIGHT, bar],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

// The complete supplied flaming-T, in original SVG paint order and colors.
// The historical Oilers helmet carries a different mark and does not receive this decal.
function decal(): PartLayer[] {
  return TITANS_DECAL_PATHS.map(({ d, fill }, index) => ({
    id: `titans-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

// The navy shell with the flaming-T — one object, shared by home, away and navy-alt.
//
// White cage. The Titans' navy shell wears a white facemask (named sources: the 2026 rebrand
// "helmet is white with white facemask", and the pre-rebrand navy-shell era wore white/gray; the
// white cage reads cleanly against the navy shell).
const HELMET_NAVY_T: UniformPart = {
  base: 'navy',
  facemask: 'white',
  layers: decal(),
};

// The oilers throwback's light-blue shell, bare (its oil-derrick mark has no figure on the sheet;
// the shell inherits the kit's primary, light blue). Same white cage as the modern shell.
const HELMET_WHITE: UniformPart = { base: 'lightBlue', facemask: 'white', layers: [] };

// Home jersey: navy body, navy bar on the silver yoke, navy numerals keylined white.

// Away jersey: white body, navy bar, navy numerals keylined white.

// Navy-alt jersey: navy body, light-blue bar (keeps the bar legible against the navy), white
// numerals keylined light-blue.

// Oilers jersey: light-blue body, red bar, white numerals keylined red.

// Home + navy-alt pants, navy.
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };

// Away pants, white.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Oilers pants, light-blue.
const PANTS_LIGHT_BLUE: UniformPart = { base: 'lightBlue', layers: [] };

export const TITANS_PALETTE = {
  navy: '#0C2340',
  lightBlue: '#4B92DB',
  red: '#C8102E',
  white: '#FFFFFF',
  silver: TITANS_SILVER,
  // Every decal hex is kept from the source artwork.
  ...Object.fromEntries(TITANS_DECAL_PATHS.map(({ fill }) => [fill, fill])),
};
export const TITANS_HELMETS = { 'navy-t': HELMET_NAVY_T, white: HELMET_WHITE };
export const TITANS_PANTS = { navy: PANTS_NAVY, white: PANTS_WHITE, lightBlue: PANTS_LIGHT_BLUE };
export const TITANS_KITS = {
  home: { helmet: 'navy-t', jersey: 'navy', pants: ['navy', 'lightBlue'] },
  away: { helmet: 'navy-t', jersey: 'white', pants: ['white', 'lightBlue'] },
  'navy-alt': { helmet: 'navy-t', jersey: 'navy-alt', pants: ['navy', 'lightBlue'] },
  'oilers-throwback': { helmet: 'white', jersey: 'light-blue', pants: ['lightBlue', 'white'] },
};
