// Houston authored as composable parts. Geometry is imported unchanged from texans.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// This is a minimal uniform: no sleeve stripe, no pant stripe, no helmet stripe. The two navy
// kits (home, away) share the SAME navy shell wearing the hand-drawn bull (white keyline, navy
// head, red horn, white star); the Battle Red kit wears a RED shell with its own different mark, a
// large stylized horn sweeping the crown. The three bodies and three pants differ: home is
// navy-over-white, away white-over-navy, Battle Red red-over-red.

import {
  TEXANS_BATTLE_RED_DECAL_PATH,
  TEXANS_BULL_KEYLINE_WIDTH,
  TEXANS_BULL_NAVY_PATH,
  TEXANS_BULL_RED_PATH,
  TEXANS_BULL_STAR_PATH,
  TEXANS_COLLAR_LEFT,
  TEXANS_COLLAR_RIGHT,
  TEXANS_COLLAR_WIDTH,
  TEXANS_DECAL_NAVY,
  TEXANS_DECAL_RED,
} from './texans';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

// The navy shell's collar trim (home only): two arcs, not a chevron (the arms never meet).
function collar(): PartLayer[] {
  return [
    {
      id: 'texans-collar-left',
      surface: 'collar',
      d: TEXANS_COLLAR_LEFT,
      clip: true,
      kind: 'stroke',
      stroke: 'red',
      strokeWidth: TEXANS_COLLAR_WIDTH,
    },
    {
      id: 'texans-collar-right',
      surface: 'collar',
      d: TEXANS_COLLAR_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke: 'red',
      strokeWidth: TEXANS_COLLAR_WIDTH,
    },
  ];
}

// The bull the navy shells wear: white keyline under a navy head and a red horn, star last. Fixed
// art — the mark is the same three colors on every shell, so nothing here takes a team token.
function bullDecal(): PartLayer[] {
  return [
    {
      id: 'texans-bull-keyline-navy',
      surface: 'helmet',
      d: TEXANS_BULL_NAVY_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: TEXANS_BULL_KEYLINE_WIDTH,
    },
    {
      id: 'texans-bull-keyline-red',
      surface: 'helmet',
      d: TEXANS_BULL_RED_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: TEXANS_BULL_KEYLINE_WIDTH,
    },
    {
      id: 'texans-bull-head',
      surface: 'helmet',
      d: TEXANS_BULL_NAVY_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalNavy',
    },
    {
      id: 'texans-bull-horn',
      surface: 'helmet',
      d: TEXANS_BULL_RED_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalRed',
    },
    {
      id: 'texans-bull-star',
      surface: 'helmet',
      d: TEXANS_BULL_STAR_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ];
}

// The navy shell with the bull — one object, shared by home and away. The bull is fixed art; its
// keyline is a stroke (safe here only because the curves are hand-drawn, see texans.ts).
//
// White cage. The Texans' navy shell wears a white facemask (named sources; the navy shell + white
// cage reads cleanly in the GUD composite). The shared neutral #4b5158 it replaces is a grey that
// floats against the navy.
const HELMET_NAVY_BULL: UniformPart = {
  base: 'navy',
  facemask: 'white',
  layers: bullDecal(),
};

// Battle Red's red shell with its own large stylized horn — a different mark from the bull.
//
// White cage. Battle Red wears the same white facemask as the navy shell (named sources; the red
// shell + white cage reads cleanly).
const HELMET_RED_HORN: UniformPart = {
  base: 'red',
  facemask: 'white',
  layers: [
    {
      id: 'texans-decal-battle-red-horn',
      surface: 'helmet',
      d: TEXANS_BATTLE_RED_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalNavy',
    },
  ],
};

// Home jersey: navy body, red collar trim, white numerals keylined red.
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: collar(),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};

// Away jersey: white body, no collar trim, navy numerals keylined red.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [],
  number: { fill: 'navy', outline: 'red', outlineWidth: 14 },
};

// Battle Red jersey: red body, no collar trim, navy numerals keylined white.
const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: [],
  number: { fill: 'navy', outline: 'white', outlineWidth: 14 },
};

// Home pants, white.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Away pants, navy.
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };

// Battle Red pants, red.
const PANTS_RED: UniformPart = { base: 'red', layers: [] };

export const TEXANS_PARTS: TeamPartsDefinition = {
  teamId: 'texans',
  // Jersey hexes from the curated rows (teamcolorcodes). Navy and red are the physical body/shell
  // colors carried in different primary/secondary/accent slots per row; the decal's navy/red are
  // the sampled fixed-art colors (see texans.ts).
  palette: {
    navy: '#03202F',
    red: '#A71930',
    white: '#FFFFFF',
    decalNavy: TEXANS_DECAL_NAVY,
    decalRed: TEXANS_DECAL_RED,
  },
  helmets: { 'navy-bull': HELMET_NAVY_BULL, 'red-horn': HELMET_RED_HORN },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    red: JERSEY_RED,
  },
  pants: { white: PANTS_WHITE, navy: PANTS_NAVY, red: PANTS_RED },
  kits: {
    home: { helmet: 'navy-bull', jersey: 'navy', pants: 'white' },
    away: { helmet: 'navy-bull', jersey: 'white', pants: 'navy' },
    'battle-red': { helmet: 'red-horn', jersey: 'red', pants: 'red' },
  },
};

export const TEXANS_UNIFORMS_FROM_PARTS = compileParts(TEXANS_PARTS);
