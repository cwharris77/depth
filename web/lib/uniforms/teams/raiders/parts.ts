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

import { RAIDERS_DECAL_PATHS } from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';

// The complete supplied mark in its original paint order: shield and keyline, wordmark, crossed
// sabres, helmeted face, and interior shading. Its source greys collapse to the team silver so the
// detail remains legible and deterministic at the archive's helmet scale.
const DECAL: PartLayer[] = RAIDERS_DECAL_PATHS.map(({ d, fill }, index) => ({
  id: `raiders-decal-svg-${String(index + 1).padStart(2, '0')}`,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
}));

// The silver shell with the shield decal — one object, shared by both kits.
//
// Black cage. The Raiders' silver shell carries a black facemask (named sources; the composite
// reads the cage bars at #000000 against the shell's #d6dbe3 and the white background). The shared
// neutral #4b5158 it replaces is a mid-grey that reads soft against the silver shell.
const HELMET_SILVER_SHIELD: UniformPart = expandHelmet('raiders-silver-shield-helmet', {
  shell: 'silver',
  facemask: 'black',
  decal: placed(DECAL),
  number: 'none',
});

// Home jersey: black body, silver numerals.

// Away jersey: white body, black numerals.

// Plain silver pants, shared by both kits.
const PANTS_SILVER: UniformPart = { base: 'silver', layers: [] };

export const RAIDERS_PALETTE = {
  black: '#000000',
  white: '#FFFFFF',
  // The shell and pants silver — the same physical color whether home reaches it through
  // 'secondary' or away through 'accent'. Silver is the Raiders' silver #A5ACAF.
  silver: '#A5ACAF',
};
export const RAIDERS_HELMETS = { 'silver-shield': HELMET_SILVER_SHIELD };
export const RAIDERS_PANTS = { silver: PANTS_SILVER };
export const RAIDERS_KITS = {
  home: { helmet: 'silver-shield', jersey: 'black', pants: 'silver' },
  away: { helmet: 'silver-shield', jersey: 'white', pants: 'silver' },
};
