// San Francisco authored as composable parts. Geometry is imported unchanged from niners.ts —
// this file only restates WHICH parts each kit combines, and names every color from the team
// palette instead of the kit row's shifting primary/secondary/accent.
//
// All three kits are ONE construction with the tokens swapped — crown stripe, three bands per
// sleeve, and the oval decal (black ring, colored field, white letters). What actually differs:
// home and away wear the SAME gold shell and SAME gold pants, and away and home differ only in
// the jersey body and the bands; Rivalries is the one kit that is genuinely different, a black
// shell and black pants under a black body. So the shared gold helmet and gold pants are one part
// each, and the black shell/pants are another — the flat form reached gold through `secondary`
// at home and `accent` away, and black through `primary` only on Rivalries.
//
// The decal keyline is fixed: it stays black on both the gold and black shells, so it is authored
// as a palette literal rather than resolving from any kit's tokens.

import { HELMET_CROWN_STRIPE_PATH } from './shared';
import {
  NINERS_DECAL_BLACK,
  NINERS_DECAL_FIELD_PATH,
  NINERS_DECAL_LETTERS_PATH,
  NINERS_DECAL_RING_PATH,
  NINERS_SLEEVE_X_LEFT,
  NINERS_SLEEVE_X_RIGHT,
  NINERS_STRIPE_HEIGHT,
  NINERS_STRIPE_TOPS,
} from './niners';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// Three bands at the end of each sleeve, mirrored. Same painting in every kit; only the color
// differs, which the jersey part supplies.
function sleeveStripes(color: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', NINERS_SLEEVE_X_LEFT],
    ['sleeve-right', NINERS_SLEEVE_X_RIGHT],
  ];
  NINERS_STRIPE_TOPS.forEach((top, i) => {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push(
        fill(
          `niners-sleeve-stripe-${i}-${side}`,
          surface,
          `M${x0},${top} H${x1} V${top + NINERS_STRIPE_HEIGHT} H${x0} Z`,
          color
        )
      );
    }
  });
  return out;
}

// Crown stripe + oval decal, shared by the two shells. The crown stripe takes the field color;
// the oval is black ring, colored field, white letters.
function helmetMarks(field: string): PartLayer[] {
  return [
    fill('niners-helmet-crown-stripe', 'helmet', HELMET_CROWN_STRIPE_PATH, field),
    {
      id: 'niners-decal-ring',
      surface: 'helmet',
      d: NINERS_DECAL_RING_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalBlack',
    },
    {
      id: 'niners-decal-field',
      surface: 'helmet',
      d: NINERS_DECAL_FIELD_PATH,
      clip: true,
      kind: 'fill',
      fill: field,
    },
    {
      id: 'niners-decal-letters',
      surface: 'helmet',
      d: NINERS_DECAL_LETTERS_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ];
}

// The gold shell with the red crown stripe and oval — one object, shared by home and away. The
// classic matte-gold shell wears a black cage (collegehelmetstore / named sources; the GUD
// composite reads the bars at #000000). The shared neutral #4b5158 it replaces is a mid-grey that
// looks wrong against the gold.
const HELMET_GOLD: UniformPart = { base: 'gold', facemask: 'black', layers: helmetMarks('red') };

// Rivalries' black shell, the same crown stripe and oval in red, but with a gold cage (Riddell:
// "low gloss black shell, flash gold facemask" — the 2025 Rivalries shell specifically).
const HELMET_BLACK: UniformPart = { base: 'black', facemask: 'gold', layers: helmetMarks('red') };

// Home jersey: red body, white sleeve bands, white numerals.
const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: sleeveStripes('white'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey: white body, red sleeve bands, red numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes('red'),
  number: { fill: 'red', outline: 'red', outlineWidth: 10 },
};

// Rivalries jersey: black body, red sleeve bands, red numerals ringed gold (the one kit where the
// keyline really shows — thin at 14).
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: sleeveStripes('red'),
  number: { fill: 'red', outline: 'gold', outlineWidth: 14 },
};

// Plain gold pants (home + away) and plain black pants (Rivalries). No pant stripe on any kit.
const PANTS_GOLD: UniformPart = { base: 'gold', layers: [] };
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const NINERS_PARTS: TeamPartsDefinition = {
  teamId: '49ers',
  // Jersey hexes from the curated rows (teamcolorcodes). Gold is the helmet/pants shell — the
  // same physical color whether home reaches it through 'secondary' or away through 'accent'.
  // Rivalries' black is its own primary.
  palette: {
    red: '#AA0000',
    gold: '#B3995D',
    white: '#FFFFFF',
    black: '#101820',
    // The decal keyline stays black on both shells (see niners.ts — sampled from the GUD
    // composite, #141414 rather than pure black).
    decalBlack: NINERS_DECAL_BLACK,
  },
  helmets: { gold: HELMET_GOLD, black: HELMET_BLACK },
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
  },
  pants: { gold: PANTS_GOLD, black: PANTS_BLACK },
  kits: {
    home: { helmet: 'gold', jersey: 'red', pants: 'gold' },
    away: { helmet: 'gold', jersey: 'white', pants: 'gold' },
    'rivalries-2025': { helmet: 'black', jersey: 'black', pants: 'black' },
  },
};

export const NINERS_UNIFORMS_FROM_PARTS = compileParts(NINERS_PARTS);
