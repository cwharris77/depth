// Baltimore authored as composable parts. Geometry is imported unchanged from ravens.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// All three kits are ONE construction with the tokens swapped: a bare black shell carrying the
// raven head, a short tilted gold-keyline bar on each shoulder cap, a solid band filling the last
// third of each sleeve, and trimmed numerals. No helmet stripe, no collar trim, no pant stripe.
//
// The measured target is 1 helmet / 3 jersey / 1 pants, and that is what this factors to. The
// single helmet is the whole point of the model here: the shell is black with the same four-layer
// mark on every kit, but the flat definition reached it three different ways — `secondary` at
// home, a literal away, and the implicit `primary` on the black alternate — because black moves
// across all three tokens. One part, named `black`, replaces all of it. Pants are likewise one
// part: purple on every kit, arrived at as `primary` at home and `secondary` on the other two.
//
// Two golds, deliberately. The shoulder keyline and the numeral outline take the kit row's accent
// (#9E7C0C), while the mark's own gold is #9A7611 — a slightly deeper value traced off the GUD
// composite. They were distinct in the flat definition and stay distinct here; collapsing them
// would repaint the mark.

import {
  RAVENS_DECAL_BEAK_PATH,
  RAVENS_DECAL_HEAD_PATH,
  RAVENS_DECAL_KEYLINE_PATH,
  RAVENS_DECAL_LETTER_PATH,
  RAVENS_SHOULDER_INNER_LEFT,
  RAVENS_SHOULDER_INNER_RIGHT,
  RAVENS_SHOULDER_OUTER_LEFT,
  RAVENS_SHOULDER_OUTER_RIGHT,
  RAVENS_SLEEVE_BAND_LEFT,
  RAVENS_SLEEVE_BAND_RIGHT,
} from './ravens';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The raven head: gold keyline, purple head, gold "B", white beak, in that paint order. Fixed art
// on every shell the club wears, so nothing here varies by kit.
function decal(): PartLayer[] {
  return (
    [
      ['ravens-decal-keyline', RAVENS_DECAL_KEYLINE_PATH, 'decalGold'],
      ['ravens-decal-head', RAVENS_DECAL_HEAD_PATH, 'purple'],
      ['ravens-decal-letter', RAVENS_DECAL_LETTER_PATH, 'decalGold'],
      ['ravens-decal-beak', RAVENS_DECAL_BEAK_PATH, 'white'],
    ] as [string, string, string][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

// Gold keyline first, face over it — the same paint order every trimmed mark here uses.
function shoulderBars(face: string): PartLayer[] {
  const bars: [string, UniformSurface, string, string][] = [
    ['ravens-shoulder-outer-left', 'sleeve-left', RAVENS_SHOULDER_OUTER_LEFT, 'gold'],
    ['ravens-shoulder-outer-right', 'sleeve-right', RAVENS_SHOULDER_OUTER_RIGHT, 'gold'],
    ['ravens-shoulder-inner-left', 'sleeve-left', RAVENS_SHOULDER_INNER_LEFT, face],
    ['ravens-shoulder-inner-right', 'sleeve-right', RAVENS_SHOULDER_INNER_RIGHT, face],
  ];
  return bars.map(([id, surface, d, fill]) => ({ id, surface, d, clip: true, kind: 'fill', fill }));
}

function sleeveBands(fill: string): PartLayer[] {
  return (
    [
      ['ravens-sleeve-band-left', 'sleeve-left', RAVENS_SLEEVE_BAND_LEFT],
      ['ravens-sleeve-band-right', 'sleeve-right', RAVENS_SLEEVE_BAND_RIGHT],
    ] as [string, UniformSurface, string][]
  ).map(([id, surface, d]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

// The only shell (H1): black, with the mark, on every kit. The cage is black too — every helmet
// figure on the GUD 2025 composite (nfl-uniform-refs/ravens) wears a black facemask, on all three
// rows. The lone gold cage on that sheet belongs to the purple 1996 throwback shell, which is not
// a kit this archive carries.
const HELMET_BLACK: UniformPart = { base: 'black', facemask: 'black', layers: decal() };

// Home jersey (J1): purple body, white bar face, black sleeve band, white numerals.
const JERSEY_PURPLE: UniformPart = {
  base: 'purple',
  layers: [...shoulderBars('white'), ...sleeveBands('black')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};

// Away jersey (J2): white body, purple bar face, black sleeve band, purple numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulderBars('purple'), ...sleeveBands('black')],
  number: { fill: 'purple', outline: 'gold', outlineWidth: 16 },
};

// Black-alternate jersey (J3): black body, white bar face, purple sleeve band, white numerals.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...shoulderBars('white'), ...sleeveBands('purple')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};

// The only pants (P1): purple and unbroken on every kit.
const PANTS_PURPLE: UniformPart = { base: 'purple', layers: [] };

export const RAVENS_PARTS: TeamPartsDefinition = {
  teamId: 'ravens',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). `gold` is the row accent that trims
  // the bars and numerals; `decalGold` is the mark's own deeper gold, traced off the GUD composite.
  palette: {
    purple: '#241773',
    black: '#000000',
    white: '#FFFFFF',
    gold: '#9E7C0C',
    decalGold: '#9A7611',
  },
  helmets: { black: HELMET_BLACK },
  jerseys: { purple: JERSEY_PURPLE, white: JERSEY_WHITE, black: JERSEY_BLACK },
  pants: { purple: PANTS_PURPLE },
  kits: {
    home: { helmet: 'black', jersey: 'purple', pants: 'purple' },
    away: { helmet: 'black', jersey: 'white', pants: 'purple' },
    'black-alt': { helmet: 'black', jersey: 'black', pants: 'purple' },
  },
};

export const RAVENS_UNIFORMS_FROM_PARTS = compileParts(RAVENS_PARTS);
