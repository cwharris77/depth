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
  RAVENS_SHOULDER_INNER_LEFT,
  RAVENS_SHOULDER_INNER_RIGHT,
  RAVENS_SHOULDER_OUTER_LEFT,
  RAVENS_SHOULDER_OUTER_RIGHT,
  RAVENS_SLEEVE_BAND_LEFT,
  RAVENS_SLEEVE_BAND_RIGHT,
} from './ravens';
import {
  RAVENS_DECAL_SVG_01_PATH,
  RAVENS_DECAL_SVG_02_PATH,
  RAVENS_DECAL_SVG_03_PATH,
  RAVENS_DECAL_SVG_04_PATH,
  RAVENS_DECAL_SVG_05_PATH,
  RAVENS_DECAL_SVG_06_PATH,
  RAVENS_DECAL_SVG_07_PATH,
  RAVENS_DECAL_SVG_08_PATH,
  RAVENS_DECAL_SVG_09_PATH,
  RAVENS_DECAL_SVG_10_PATH,
  RAVENS_DECAL_SVG_11_PATH,
  RAVENS_DECAL_SVG_12_PATH,
  RAVENS_DECAL_SVG_13_PATH,
  RAVENS_DECAL_SVG_14_PATH,
  RAVENS_DECAL_SVG_15_PATH,
  RAVENS_DECAL_SVG_16_PATH,
} from './ravens-decal';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The supplied SVG's original paint order. Source gold eye-ring path 12 is deliberately red;
// its adjacent black pupil stays intact. Fixed art on every shell, so nothing varies by kit.
function decal(): PartLayer[] {
  return (
    [
      ['ravens-decal-svg-01', RAVENS_DECAL_SVG_01_PATH, 'purple'],
      ['ravens-decal-svg-02', RAVENS_DECAL_SVG_02_PATH, 'black'],
      ['ravens-decal-svg-03', RAVENS_DECAL_SVG_03_PATH, 'decalGold'],
      ['ravens-decal-svg-04', RAVENS_DECAL_SVG_04_PATH, 'white'],
      ['ravens-decal-svg-05', RAVENS_DECAL_SVG_05_PATH, 'white'],
      ['ravens-decal-svg-06', RAVENS_DECAL_SVG_06_PATH, 'decalGold'],
      ['ravens-decal-svg-07', RAVENS_DECAL_SVG_07_PATH, 'decalGold'],
      ['ravens-decal-svg-08', RAVENS_DECAL_SVG_08_PATH, 'purple'],
      ['ravens-decal-svg-09', RAVENS_DECAL_SVG_09_PATH, 'white'],
      ['ravens-decal-svg-10', RAVENS_DECAL_SVG_10_PATH, 'purple'],
      ['ravens-decal-svg-11', RAVENS_DECAL_SVG_11_PATH, 'black'],
      ['ravens-decal-svg-12', RAVENS_DECAL_SVG_12_PATH, 'red'],
      ['ravens-decal-svg-13', RAVENS_DECAL_SVG_13_PATH, 'black'],
      ['ravens-decal-svg-14', RAVENS_DECAL_SVG_14_PATH, 'black'],
      ['ravens-decal-svg-15', RAVENS_DECAL_SVG_15_PATH, 'white'],
      ['ravens-decal-svg-16', RAVENS_DECAL_SVG_16_PATH, 'purple'],
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
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). `gold` trims bars and numerals;
  // `decalGold` and the explicit red eye come from the supplied club vector.
  palette: {
    purple: '#241773',
    black: '#000000',
    white: '#FFFFFF',
    gold: '#9E7C0C',
    decalGold: '#9A7611',
    red: '#C60C30',
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
