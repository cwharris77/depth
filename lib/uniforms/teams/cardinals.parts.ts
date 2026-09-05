// Arizona authored as composable parts. Geometry is imported unchanged from cardinals.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// Arizona's construction is unusually spare: no helmet stripe, no shoulder yoke, no contrasting
// collar. The four kits differ in the shell (white for home/away, black for black-alt, cream for
// rivalries) and the body/sleeve treatment: home is a solid red body with a white shoulder bar;
// away and black-alt carry two horizontal sleeve bands on white/black bodies; rivalries is a cream
// body with no stripe geometry. The decal is the full-color mark on the white/black shells and a
// red-on-cream version on the rivalries shell.

import {
  CARDINALS_DECAL_BEAK_PATH,
  CARDINALS_DECAL_BODY_PATH,
  CARDINALS_DECAL_EYE_PATH,
  CARDINALS_DECAL_GOLD,
  CARDINALS_DECAL_KEYLINE_PATH,
  CARDINALS_DECAL_RED,
  CARDINALS_NUMBER_KEYLINE,
  CARDINALS_SHOULDER_BAR_LEFT,
  CARDINALS_SHOULDER_BAR_RIGHT,
  CARDINALS_SLEEVE_BAND_LOWER_LEFT,
  CARDINALS_SLEEVE_BAND_LOWER_RIGHT,
  CARDINALS_SLEEVE_BAND_UPPER_LEFT,
  CARDINALS_SLEEVE_BAND_UPPER_RIGHT,
} from './cardinals';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

// The full-color decal: keyline, red body, white eye, gold beak — each carries its own holes, so
// every layer must render with fill-rule evenodd.
function fullDecal(): PartLayer[] {
  return (
    [
      ['cardinals-decal-keyline', CARDINALS_DECAL_KEYLINE_PATH, 'numberKeyline'],
      ['cardinals-decal-body', CARDINALS_DECAL_BODY_PATH, 'decalRed'],
      ['cardinals-decal-eye', CARDINALS_DECAL_EYE_PATH, 'white'],
      ['cardinals-decal-beak', CARDINALS_DECAL_BEAK_PATH, 'decalGold'],
    ] as [string, string, string][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fillRule: 'evenodd' as const,
    fill,
  }));
}

// Rivalries' red-on-cream mark: red keyline and body, cream eye and beak.
function rivalDecal(): PartLayer[] {
  return (
    [
      ['cardinals-decal-keyline', CARDINALS_DECAL_KEYLINE_PATH, 'rivalRed'],
      ['cardinals-decal-body', CARDINALS_DECAL_BODY_PATH, 'rivalRed'],
      ['cardinals-decal-eye', CARDINALS_DECAL_EYE_PATH, 'cream'],
      ['cardinals-decal-beak', CARDINALS_DECAL_BEAK_PATH, 'cream'],
    ] as [string, string, string][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fillRule: 'evenodd' as const,
    fill,
  }));
}

// The two horizontal sleeve bands.
function sleeveBands(color: string): PartLayer[] {
  return [
    {
      id: 'cardinals-sleeve-upper-left',
      surface: 'sleeve-left',
      d: CARDINALS_SLEEVE_BAND_UPPER_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'cardinals-sleeve-upper-right',
      surface: 'sleeve-right',
      d: CARDINALS_SLEEVE_BAND_UPPER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'cardinals-sleeve-lower-left',
      surface: 'sleeve-left',
      d: CARDINALS_SLEEVE_BAND_LOWER_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'cardinals-sleeve-lower-right',
      surface: 'sleeve-right',
      d: CARDINALS_SLEEVE_BAND_LOWER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// The white shell with the full-color decal — shared by home and away. The shell is a white
// literal in the flat (no white token on the home palette).
//
// White cage. The white Cardinals shell wears a white facemask (named sources; white-on-white
// matches the shell).
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: fullDecal(),
};

// The black shell with the full-color decal (H3, black-alt).
//
// Black cage. The black-alt shell wears a black facemask (named sources; the black-on-black cage
// reads as the shell).
const HELMET_BLACK: UniformPart = {
  base: 'black',
  facemask: 'black',
  layers: fullDecal(),
};

// Rivalries' cream shell with the red-on-cream mark (H2, rivalries).
const HELMET_CREAM: UniformPart = {
  base: 'cream',
  facemask: 'white',
  layers: rivalDecal(),
};

// Home jersey: solid cardinal body, white shoulder bar, plain white numerals (no keyline).
const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: [
    {
      id: 'cardinals-shoulder-bar-left',
      surface: 'sleeve-left',
      d: CARDINALS_SHOULDER_BAR_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'cardinals-shoulder-bar-right',
      surface: 'sleeve-right',
      d: CARDINALS_SHOULDER_BAR_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ],
  number: { fill: 'white', outline: 'white', outlineWidth: 26 },
};

// Away jersey: white body, cardinal sleeve bands, red numerals keylined black.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveBands('cardinal'),
  number: { fill: 'cardinal', outline: 'numberKeyline', outlineWidth: 26 },
};

// black-alt jersey (J4): black body, cardinal sleeve bands, red numerals keylined white.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: sleeveBands('cardinal'),
  number: { fill: 'cardinal', outline: 'white', outlineWidth: 26 },
};

// Rivalries jersey (J3): cream body, no stripe geometry, red numerals with the orange offset (read as
// an outline — the closest NumberStyle can express).
const JERSEY_RIVALRIES: UniformPart = {
  base: 'cream',
  layers: [],
  number: { fill: 'rivalRed', outline: 'rivalOrange', outlineWidth: 26 },
};

// Red pants (home), unbroken.
const PANTS_RED: UniformPart = { base: 'red', layers: [] };

// Away pants (P2): white, with the red generic pant stripe (away does not strip it).
const PANTS_WHITE: UniformPart = {
  base: 'white',
  layers: [
    {
      id: 'generic-pants-stripe-left',
      surface: 'leg-left',
      d: 'M118,807 H134 V1462 H118 Z',
      clip: true,
      kind: 'fill',
      fill: 'cardinal',
    },
    {
      id: 'generic-pants-stripe-right',
      surface: 'leg-right',
      d: 'M454,807 H470 V1462 H454 Z',
      clip: true,
      kind: 'fill',
      fill: 'cardinal',
    },
  ],
};

// black-alt pants (P4): black, with the same red generic pant stripe (black-alt does not strip
// it either).
const PANTS_BLACK: UniformPart = {
  base: 'black',
  layers: [
    {
      id: 'generic-pants-stripe-left',
      surface: 'leg-left',
      d: 'M118,807 H134 V1462 H118 Z',
      clip: true,
      kind: 'fill',
      fill: 'cardinal',
    },
    {
      id: 'generic-pants-stripe-right',
      surface: 'leg-right',
      d: 'M454,807 H470 V1462 H454 Z',
      clip: true,
      kind: 'fill',
      fill: 'cardinal',
    },
  ],
};

// Cream pants (rivalries).
const PANTS_CREAM: UniformPart = { base: 'cream', layers: [] };

export const CARDINALS_PARTS: TeamPartsDefinition = {
  teamId: 'cardinals',
  // Construction hexes from the module / curated rows. Cardinal/black/white are the physical body
  // colors; cream and rival-red/orange are Rivalries' curated palette; the decal red/gold and the
  // number keyline are the sampled fixed-art colors.
  palette: {
    red: '#97233F',
    cardinal: '#97233F',
    black: '#000000',
    white: '#FFFFFF',
    cream: '#FFF7E3',
    rivalRed: '#B31529',
    rivalOrange: '#EE6B3D',
    decalRed: CARDINALS_DECAL_RED,
    decalGold: CARDINALS_DECAL_GOLD,
    numberKeyline: CARDINALS_NUMBER_KEYLINE,
  },
  helmets: { white: HELMET_WHITE, black: HELMET_BLACK, cream: HELMET_CREAM },
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
    rivalries: JERSEY_RIVALRIES,
  },
  pants: { red: PANTS_RED, white: PANTS_WHITE, cream: PANTS_CREAM, black: PANTS_BLACK },
  kits: {
    home: { helmet: 'white', jersey: 'red', pants: 'red' },
    away: { helmet: 'white', jersey: 'white', pants: 'white' },
    'black-alt': { helmet: 'black', jersey: 'black', pants: 'black' },
    'rivalries-2025': { helmet: 'cream', jersey: 'rivalries', pants: 'cream' },
  },
};

export const CARDINALS_UNIFORMS_FROM_PARTS = compileParts(CARDINALS_PARTS);
