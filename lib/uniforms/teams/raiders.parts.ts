// Las Vegas authored as composable parts. Geometry is imported unchanged from raiders.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: both Raiders kits wear the SAME silver shell with the
// shield decal (white keyline, black shield, white face — fixed art) and the SAME silver pants.
// The flat form reached the shell and pants through `secondary` at home and `accent` away (silver
// is a different token per row), and the numerals through `secondary` both times but meaning
// silver at home and black away. Only the jersey body actually differs: black at home, white away,
// with the away numerals black to match.

import {
  RAIDERS_DECAL_FACE_PATH,
  RAIDERS_DECAL_KEYLINE_PATH,
  RAIDERS_DECAL_SHIELD_PATH,
} from './raiders';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

// The shield decal: white keyline, black shield, white face. Fixed art — black and white on both
// silver shells, so nothing here takes a team token.
const DECAL: PartLayer[] = [
  {
    id: 'raiders-decal-keyline',
    surface: 'helmet',
    d: RAIDERS_DECAL_KEYLINE_PATH,
    clip: true,
    kind: 'fill',
    fill: 'white',
  },
  {
    id: 'raiders-decal-shield',
    surface: 'helmet',
    d: RAIDERS_DECAL_SHIELD_PATH,
    clip: true,
    kind: 'fill',
    fill: 'black',
  },
  {
    id: 'raiders-decal-face',
    surface: 'helmet',
    d: RAIDERS_DECAL_FACE_PATH,
    clip: true,
    kind: 'fill',
    fill: 'white',
  },
];

// The silver shell with the shield decal — one object, shared by both kits.
//
// Black cage. The Raiders' silver shell carries a black facemask (named sources; the GUD composite
// reads the cage bars at #000000 against the shell's #d6dbe3 and the white background). The shared
// neutral #4b5158 it replaces is a mid-grey that reads soft against the silver shell.
const HELMET_SILVER_SHIELD: UniformPart = {
  base: 'silver',
  facemask: 'black',
  layers: DECAL,
};

// Home jersey: black body, silver numerals.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [],
  number: { fill: 'silver', outline: 'silver', outlineWidth: 10 },
};

// Away jersey: white body, black numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [],
  number: { fill: 'black', outline: 'black', outlineWidth: 10 },
};

// Plain silver pants, shared by both kits.
const PANTS_SILVER: UniformPart = { base: 'silver', layers: [] };

export const RAIDERS_PARTS: TeamPartsDefinition = {
  teamId: 'raiders',
  // Jersey hexes from the curated rows (teamcolorcodes) — the same three the two rows carry
  // across their primary/secondary/accent slots, where silver is a different token per kit.
  palette: {
    black: '#000000',
    white: '#FFFFFF',
    // The shell and pants silver — the same physical color whether home reaches it through
    // 'secondary' or away through 'accent'. Silver is the Raiders' silver #A5ACAF.
    silver: '#A5ACAF',
  },
  helmets: { 'silver-shield': HELMET_SILVER_SHIELD },
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
  },
  pants: { silver: PANTS_SILVER },
  kits: {
    home: { helmet: 'silver-shield', jersey: 'black', pants: 'silver' },
    away: { helmet: 'silver-shield', jersey: 'white', pants: 'silver' },
  },
};

export const RAIDERS_UNIFORMS_FROM_PARTS = compileParts(RAIDERS_PARTS);
