// Jacksonville authored as composable parts. Geometry is imported unchanged from jaguars.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// Every kit is a black shell over a body carrying a band at the sleeve hem and trim at the neck.
// What changes is how each is built: the current kits wear one solid band and a short arc down each
// side of the neck opening, while the throwback wears a two-color band and a full V that closes at
// the chest. No helmet stripe and no pant stripe. The jaguar-head decal (white jaw, gold crown,
// teal tongue) is fixed art worn only on the BLACK shells — the teal throwback shell stays bare
// (the crown spots would read wrong on teal).
//
// The kits combine two helmets (black shared by home/away/black-alt, teal bare throwback), four
// jerseys (teal, white, teal-with-bands, black) and two pants (white shared by home/away/teal,
// black for black-alt).

import {
  JAGUARS_BAND_LEFT,
  JAGUARS_BAND_RIGHT,
  JAGUARS_BLACK,
  JAGUARS_COLLAR_ARC_LEFT,
  JAGUARS_COLLAR_ARC_RIGHT,
  JAGUARS_COLLAR_ARC_WIDTH,
  JAGUARS_DECAL_CROWN_PATH,
  JAGUARS_DECAL_GOLD,
  JAGUARS_DECAL_JAW_PATH,
  JAGUARS_DECAL_TEAL,
  JAGUARS_DECAL_TONGUE_PATH,
  JAGUARS_TB_BAND_LOWER_LEFT,
  JAGUARS_TB_BAND_LOWER_RIGHT,
  JAGUARS_TB_BAND_UPPER_LEFT,
  JAGUARS_TB_BAND_UPPER_RIGHT,
  JAGUARS_TB_COLLAR_PATH,
  JAGUARS_TB_COLLAR_WIDTH,
} from './jaguars';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

// The jaguar-head decal — white jaw, gold crown, teal tongue. Fixed art on the black shells.
function jaguarDecal(): PartLayer[] {
  return [
    {
      id: 'jaguars-decal-jaw',
      surface: 'helmet',
      d: JAGUARS_DECAL_JAW_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'jaguars-decal-crown',
      surface: 'helmet',
      d: JAGUARS_DECAL_CROWN_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalGold',
    },
    {
      id: 'jaguars-decal-tongue',
      surface: 'helmet',
      d: JAGUARS_DECAL_TONGUE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decalTeal',
    },
  ];
}

// The current kits' single solid sleeve band.
function sleeveBand(color: string): PartLayer[] {
  return [
    {
      id: 'jaguars-band-left',
      surface: 'sleeve-left',
      d: JAGUARS_BAND_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'jaguars-band-right',
      surface: 'sleeve-right',
      d: JAGUARS_BAND_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// The current kits' two short collar arcs (arms never meet — not a chevron).
function collarArcs(color: string): PartLayer[] {
  return [
    {
      id: 'jaguars-collar-left',
      surface: 'collar',
      d: JAGUARS_COLLAR_ARC_LEFT,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
    },
    {
      id: 'jaguars-collar-right',
      surface: 'collar',
      d: JAGUARS_COLLAR_ARC_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
    },
  ];
}

// The throwback's two-color band and closing collar V.
function throwbackBands(upper: string, lower: string): PartLayer[] {
  return [
    {
      id: 'jaguars-band-upper-left',
      surface: 'sleeve-left',
      d: JAGUARS_TB_BAND_UPPER_LEFT,
      clip: true,
      kind: 'fill',
      fill: upper,
    },
    {
      id: 'jaguars-band-upper-right',
      surface: 'sleeve-right',
      d: JAGUARS_TB_BAND_UPPER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: upper,
    },
    {
      id: 'jaguars-band-lower-left',
      surface: 'sleeve-left',
      d: JAGUARS_TB_BAND_LOWER_LEFT,
      clip: true,
      kind: 'fill',
      fill: lower,
    },
    {
      id: 'jaguars-band-lower-right',
      surface: 'sleeve-right',
      d: JAGUARS_TB_BAND_LOWER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: lower,
    },
    {
      id: 'jaguars-collar-v',
      surface: 'collar',
      d: JAGUARS_TB_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: lower,
      strokeWidth: JAGUARS_TB_COLLAR_WIDTH,
    },
  ];
}

// The black shell with the jaguar decal (H1) — shared by home, away and black-alt.
//
// Black cage. The black Jaguars shell wears a black facemask (named sources; the matte black shell
// pairs a dark cage).
const HELMET_BLACK: UniformPart = {
  base: 'black',
  facemask: 'black',
  layers: jaguarDecal(),
};

// The 1998 throwback shell (H2): a BLACK shell (the kit's accent #101820) with NO decal. The flat
// sets helmetColor to accent = black, so the shell is black and stays bare. The module note about
// "teal shell" describes the hypothetical case; the actual accent is black. The jaguar decal is
// therefore only on H1 (home/away/black-alt).
const HELMET_TEAL: UniformPart = { base: 'black', facemask: 'black', layers: [] };

// Home jersey (J1): teal body, black band + collar arcs, white numerals.
const JERSEY_TEAL: UniformPart = {
  base: 'teal',
  layers: [...sleeveBand('black'), ...collarArcs('black')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey (J2): white body, black band + collar arcs, black numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBand('black'), ...collarArcs('black')],
  number: { fill: 'black', outline: 'black', outlineWidth: 10 },
};

// Teal throwback jersey (J3): teal body, gold/black two-band + black collar V, white numerals
// keylined gold.
const JERSEY_TR: UniformPart = {
  base: 'teal',
  layers: throwbackBands('gold', 'black'),
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};

// black-alt jersey (J4): black body, gold band + collar arcs, white numerals keylined gold.
const JERSEY_BLACK_ALT: UniformPart = {
  base: 'black',
  layers: [...sleeveBand('gold'), ...collarArcs('gold')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 16 },
};

// White pants (P1, home/away/teal-throwback).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Black pants (P2, black-alt).
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const JAGUARS_PARTS: TeamPartsDefinition = {
  teamId: 'jaguars',
  // Construction hexes from the module / curated rows. Teal/gold/black/white are the physical body
  // colors; the decal gold/teal are fixed art.
  palette: {
    teal: '#006778',
    gold: '#D7A22A',
    black: JAGUARS_BLACK,
    white: '#FFFFFF',
    decalGold: JAGUARS_DECAL_GOLD,
    decalTeal: JAGUARS_DECAL_TEAL,
  },
  helmets: { black: HELMET_BLACK, throwback: HELMET_TEAL },
  jerseys: {
    teal: JERSEY_TEAL,
    white: JERSEY_WHITE,
    tr: JERSEY_TR,
    blackAlt: JERSEY_BLACK_ALT,
  },
  pants: { white: PANTS_WHITE, black: PANTS_BLACK },
  kits: {
    home: { helmet: 'black', jersey: 'teal', pants: 'white' },
    away: { helmet: 'black', jersey: 'white', pants: 'white' },
    'teal-throwback': { helmet: 'throwback', jersey: 'tr', pants: 'white' },
    'black-alt': { helmet: 'black', jersey: 'blackAlt', pants: 'black' },
  },
};

export const JAGUARS_UNIFORMS_FROM_PARTS = compileParts(JAGUARS_PARTS);
