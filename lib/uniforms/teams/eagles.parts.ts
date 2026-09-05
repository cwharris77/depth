// Philadelphia authored as composable parts. Geometry is imported unchanged from eagles.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The current kits (home, away) are one construction: a deep collar yoke and a solid band at the
// sleeve hem. The kelly-green throwback drops the cuff entirely (its sleeve runs unbroken to the
// hem) and keeps only the collar. No helmet stripe, no pant stripe on any kit. All four shells wear
// the same wing: white over a black outline, so neither color moves with the palette. The four kits
// combine three helmets (green shell, kelly shell, black shell) and four jerseys/pants (green,
// white, black, kelly).

import {
  EAGLES_BLACK,
  EAGLES_COLLAR_PATH,
  EAGLES_COLLAR_WIDTH,
  EAGLES_CUFF_LEFT,
  EAGLES_CUFF_RIGHT,
  EAGLES_DECAL_BODY_PATH,
  EAGLES_DECAL_OUTLINE_PATH,
} from './eagles';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

// The wing — white over a black outline, the same decal on every shell. Fixed literals.
function wing(): PartLayer[] {
  return [
    {
      id: 'eagles-decal-outline',
      surface: 'helmet',
      d: EAGLES_DECAL_OUTLINE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'black',
    },
    {
      id: 'eagles-decal-body',
      surface: 'helmet',
      d: EAGLES_DECAL_BODY_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ];
}

// The solid sleeve cuff band at the hem.
function cuff(color: string): PartLayer[] {
  return [
    {
      id: 'eagles-cuff-left',
      surface: 'sleeve-left',
      d: EAGLES_CUFF_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'eagles-cuff-right',
      surface: 'sleeve-right',
      d: EAGLES_CUFF_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// The deep collar yoke (deeper than the generic chevron).
function collar(color: string): PartLayer[] {
  return [
    {
      id: 'eagles-collar',
      surface: 'collar',
      d: EAGLES_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: EAGLES_COLLAR_WIDTH,
    },
  ];
}

// Green shell (H1) — shared by home and away.
const HELMET_GREEN: UniformPart = { base: 'green', facemask: 'black', layers: wing() };

// Kelly-green shell (H2).
const HELMET_KELLY: UniformPart = { base: 'kelly', facemask: 'black', layers: wing() };

// Black shell (H3, black-alt).
const HELMET_BLACK: UniformPart = { base: 'black', facemask: 'black', layers: wing() };

// Home jersey (J1): midnight-green body, black cuff + collar, white numerals keylined black.
const JERSEY_GREEN: UniformPart = {
  base: 'green',
  layers: [...cuff('black'), ...collar('black')],
  number: { fill: 'white', outline: 'black', outlineWidth: 14 },
};

// Away jersey (J3): white body, black cuff + collar, green numerals keylined black.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...cuff('black'), ...collar('black')],
  number: { fill: 'green', outline: 'black', outlineWidth: 14 },
};

// Black-alt jersey (J4): black body, silver cuff + collar, white numerals keylined silver.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...cuff('silver'), ...collar('silver')],
  number: { fill: 'white', outline: 'silver', outlineWidth: 14 },
};

// Kelly-green jersey (J2): kelly body, NO cuff, white collar, white numerals keylined silver.
const JERSEY_KELLY: UniformPart = {
  base: 'kelly',
  layers: [...collar('white')],
  number: { fill: 'white', outline: 'silver', outlineWidth: 14 },
};

// Pants — no pant stripe on any kit; each takes its body color.
const PANTS_GREEN: UniformPart = { base: 'green', layers: [] };
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };
const PANTS_KELLY: UniformPart = { base: 'kelly', layers: [] };

export const EAGLES_PARTS: TeamPartsDefinition = {
  teamId: 'eagles',
  // Construction hexes from the module / curated rows. Green/kelly/black/white/silver are the
  // physical colors carried in different primary/secondary/accent slots per row.
  palette: {
    green: '#004C54',
    kelly: '#046A38',
    black: EAGLES_BLACK,
    white: '#FFFFFF',
    silver: '#A5ACAF',
  },
  helmets: { green: HELMET_GREEN, kelly: HELMET_KELLY, black: HELMET_BLACK },
  jerseys: {
    green: JERSEY_GREEN,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
    kelly: JERSEY_KELLY,
  },
  pants: { green: PANTS_GREEN, white: PANTS_WHITE, black: PANTS_BLACK, kelly: PANTS_KELLY },
  kits: {
    home: { helmet: 'green', jersey: 'green', pants: 'green' },
    away: { helmet: 'green', jersey: 'white', pants: 'white' },
    'black-alt': { helmet: 'black', jersey: 'black', pants: 'black' },
    'kelly-green': { helmet: 'kelly', jersey: 'kelly', pants: 'kelly' },
  },
};

export const EAGLES_UNIFORMS_FROM_PARTS = compileParts(EAGLES_PARTS);
