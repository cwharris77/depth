// Tennessee authored as composable parts. Geometry is imported unchanged from titans.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The four kits resolve to two helmets: the navy shell wearing the circle-T (home, away, navy-alt
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
  TITANS_DECAL_FIELD_PATH,
  TITANS_DECAL_LIGHT_BLUE,
  TITANS_DECAL_RED,
  TITANS_DECAL_RING_INNER_PATH,
  TITANS_DECAL_RING_OUTER_PATH,
  TITANS_DECAL_STARS_PATH,
  TITANS_DECAL_T_PATH,
  TITANS_SILVER,
  TITANS_YOKE_LEFT,
  TITANS_YOKE_RIGHT,
} from './titans';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The silver shoulder yoke with the navy bar over it — the same construction in every kit, with
// only the bar color differing (which the jersey supplies).
function shoulders(bar: string): PartLayer[] {
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

// The circle-T decal: light-blue ring, white ring, navy field, white T, red stars. Fixed art on
// the navy shell — the mark is the same five colors wherever it is worn, so nothing here takes a
// team token. The oilers throwback does NOT get it (its white shell carries a different mark).
function decal(): PartLayer[] {
  return [
    {
      id: 'titans-decal-ring-outer',
      surface: 'helmet',
      d: TITANS_DECAL_RING_OUTER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalLightBlue',
    },
    {
      id: 'titans-decal-ring-inner',
      surface: 'helmet',
      d: TITANS_DECAL_RING_INNER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'titans-decal-field',
      surface: 'helmet',
      d: TITANS_DECAL_FIELD_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalNavy',
    },
    {
      id: 'titans-decal-t',
      surface: 'helmet',
      d: TITANS_DECAL_T_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'titans-decal-stars',
      surface: 'helmet',
      d: TITANS_DECAL_STARS_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalRed',
    },
  ];
}

// The navy shell with the circle-T — one object, shared by home, away and navy-alt.
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
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: shoulders('navy'),
  number: { fill: 'navy', outline: 'white', outlineWidth: 14 },
};

// Away jersey: white body, navy bar, navy numerals keylined white.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: shoulders('navy'),
  number: { fill: 'navy', outline: 'white', outlineWidth: 14 },
};

// Navy-alt jersey: navy body, light-blue bar (keeps the bar legible against the navy), white
// numerals keylined light-blue.
const JERSEY_NAVY_ALT: UniformPart = {
  base: 'navy',
  layers: shoulders('lightBlue'),
  number: { fill: 'white', outline: 'lightBlue', outlineWidth: 14 },
};

// Oilers jersey: light-blue body, red bar, white numerals keylined red.
const JERSEY_LIGHT_BLUE: UniformPart = {
  base: 'lightBlue',
  layers: shoulders('red'),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};

// Home + navy-alt pants, navy.
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };

// Away pants, white.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Oilers pants, light-blue.
const PANTS_LIGHT_BLUE: UniformPart = { base: 'lightBlue', layers: [] };

export const TITANS_PARTS: TeamPartsDefinition = {
  teamId: 'titans',
  // Jersey hexes from the curated rows (teamcolorcodes). Navy, light-blue and red are the physical
  // body/accent colors the rows carry in different slots; silver is the shoulder-yoke literal (no
  // Titans palette carries it); the decal's light-blue/red/navy are the mark's fixed colors.
  palette: {
    navy: '#0C2340',
    lightBlue: '#4B92DB',
    red: '#C8102E',
    white: '#FFFFFF',
    silver: TITANS_SILVER,
    decalLightBlue: TITANS_DECAL_LIGHT_BLUE,
    decalRed: TITANS_DECAL_RED,
    decalNavy: '#0C2340',
  },
  helmets: { 'navy-t': HELMET_NAVY_T, white: HELMET_WHITE },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    'navy-alt': JERSEY_NAVY_ALT,
    'light-blue': JERSEY_LIGHT_BLUE,
  },
  pants: { navy: PANTS_NAVY, white: PANTS_WHITE, lightBlue: PANTS_LIGHT_BLUE },
  kits: {
    home: { helmet: 'navy-t', jersey: 'navy', pants: 'navy' },
    away: { helmet: 'navy-t', jersey: 'white', pants: 'white' },
    'navy-alt': { helmet: 'navy-t', jersey: 'navy-alt', pants: 'navy' },
    'oilers-throwback': { helmet: 'white', jersey: 'light-blue', pants: 'lightBlue' },
  },
};

export const TITANS_UNIFORMS_FROM_PARTS = compileParts(TITANS_PARTS);
