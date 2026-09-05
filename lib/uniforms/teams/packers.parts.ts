// Green Bay authored as composable parts. Geometry is imported unchanged from packers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The construction is fixed: every kit wears the same green/white/green helmet stripe set, the
// same gold/white/gold sleeve set and the same concentric gold/white/gold collar. The four kits
// combine only three helmets, three jerseys and three pants:
//   home            gold shell+marks / green body / gold pants+stripe
//   away            gold shell+marks / white body / gold pants+stripe   (shares the white body
//                     with winter-warning below, and the gold shell/pants with home)
//   winter-warning  white shell+marks / white body / white pants+stripe (shares the white body)
//   1923-throwback  leather shell, bare / navy body / leather pants     (bronze sleeve+collar)

import {
  PACKERS_COLLAR_WIDTHS,
  PACKERS_DECAL_FIELD_PATH,
  PACKERS_DECAL_OVAL_PATH,
  PACKERS_HELMET_STRIPE_INNER_PATH,
  PACKERS_HELMET_STRIPE_PATH,
  PACKERS_PANTS_GREEN_LEFT,
  PACKERS_PANTS_GREEN_RIGHT,
  PACKERS_PANTS_WHITE_LEFT,
  PACKERS_PANTS_WHITE_RIGHT,
  PACKERS_SLEEVE_GOLD_LOWER_LEFT,
  PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
  PACKERS_SLEEVE_GOLD_UPPER_LEFT,
  PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
  PACKERS_SLEEVE_WHITE_LEFT,
  PACKERS_SLEEVE_WHITE_RIGHT,
} from './packers';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';

// Gold/white/gold sleeve stripe set.
function sleeveStripes(): PartLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: string }[] = [
    {
      id: 'packers-sleeve-gold-upper-left',
      surface: 'sleeve-left',
      d: PACKERS_SLEEVE_GOLD_UPPER_LEFT,
      fill: 'gold',
    },
    {
      id: 'packers-sleeve-gold-upper-right',
      surface: 'sleeve-right',
      d: PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
      fill: 'gold',
    },
    {
      id: 'packers-sleeve-white-left',
      surface: 'sleeve-left',
      d: PACKERS_SLEEVE_WHITE_LEFT,
      fill: 'white',
    },
    {
      id: 'packers-sleeve-white-right',
      surface: 'sleeve-right',
      d: PACKERS_SLEEVE_WHITE_RIGHT,
      fill: 'white',
    },
    {
      id: 'packers-sleeve-gold-lower-left',
      surface: 'sleeve-left',
      d: PACKERS_SLEEVE_GOLD_LOWER_LEFT,
      fill: 'gold',
    },
    {
      id: 'packers-sleeve-gold-lower-right',
      surface: 'sleeve-right',
      d: PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
      fill: 'gold',
    },
  ];
  return shapes.map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' }));
}

// Concentric gold/white/gold collar, widest gold first.
function collar(): PartLayer[] {
  return [
    { id: 'packers-collar-outer', stroke: 'gold', strokeWidth: PACKERS_COLLAR_WIDTHS.gold },
    { id: 'packers-collar-mid', stroke: 'white', strokeWidth: PACKERS_COLLAR_WIDTHS.white },
    { id: 'packers-collar-inner', stroke: 'gold', strokeWidth: PACKERS_COLLAR_WIDTHS.goldInner },
  ].map((s): PartLayer => ({
    ...s,
    surface: 'collar',
    d: COLLAR_PATH,
    clip: true,
    kind: 'stroke',
  }));
}

// Green/white/green pant stripe set.
function pantsStripes(): PartLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: string }[] = [
    {
      id: 'packers-pants-outer-left',
      surface: 'leg-left',
      d: PACKERS_PANTS_GREEN_LEFT,
      fill: 'green',
    },
    {
      id: 'packers-pants-outer-right',
      surface: 'leg-right',
      d: PACKERS_PANTS_GREEN_RIGHT,
      fill: 'green',
    },
    {
      id: 'packers-pants-inner-left',
      surface: 'leg-left',
      d: PACKERS_PANTS_WHITE_LEFT,
      fill: 'white',
    },
    {
      id: 'packers-pants-inner-right',
      surface: 'leg-right',
      d: PACKERS_PANTS_WHITE_RIGHT,
      fill: 'white',
    },
  ];
  return shapes.map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' }));
}

// The green/white/green crown stripe, hugging the shell silhouette.
function helmetStripe(): PartLayer[] {
  return [
    {
      id: 'packers-helmet-stripe',
      surface: 'helmet',
      d: PACKERS_HELMET_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'green',
    },
    {
      id: 'packers-helmet-stripe-inner',
      surface: 'helmet',
      d: PACKERS_HELMET_STRIPE_INNER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ];
}

// The G decal: white field over a green oval; the green glyph reads through the evenodd counter.
function decal(): PartLayer[] {
  return [
    {
      id: 'packers-decal-oval',
      surface: 'helmet',
      d: PACKERS_DECAL_OVAL_PATH,
      clip: true,
      kind: 'fill',
      fillRule: 'evenodd',
      fill: 'green',
    },
    {
      id: 'packers-decal-field',
      surface: 'helmet',
      d: PACKERS_DECAL_FIELD_PATH,
      clip: true,
      kind: 'fill',
      fillRule: 'evenodd',
      fill: 'white',
    },
  ];
}

// The gold shell with the stripe set and the G decal — shared by home and away.
//
// Grey cage. The modern gold shell wears a grey/light-grey facemask (named sources); the GUD
// composite reads it at #8f8f90 against the gold, clearly distinct from the shell. The shared
// neutral #4b5158 it replaces is a darker grey than the real cage.
const HELMET_GOLD: UniformPart = {
  base: 'gold',
  facemask: 'cageGrey',
  layers: [...helmetStripe(), ...decal()],
};

// The 1923 throwback's leather shell, bare — no stripe, no decal (the era had neither), and no
// documented cage (it predates the facemask). Left on the default.
const HELMET_LEATHER: UniformPart = { base: 'leather', layers: [] };

// Winter Warning's white shell, carrying the same stripe and decal as the gold one, and the same
// modern grey cage.
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'cageGrey',
  layers: [...helmetStripe(), ...decal()],
};

// Green body (home): gold/white/gold sleeve set, concentric collar, white numerals.
const JERSEY_GREEN: UniformPart = {
  base: 'green',
  layers: [...sleeveStripes(), ...collar()],
  number: { fill: 'white', outline: 'white', outlineWidth: 26 },
};

// White body (away + winter-warning): the same gold/white/gold sleeve set and collar, green
// numerals. One part, two kits — the factoring the flat form spelled out twice.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveStripes(), ...collar()],
  number: { fill: 'green', outline: 'green', outlineWidth: 26 },
};

// The 1923 navy body: bronze sleeve bands and a bronze collar (the kit's stripped construction
// keeps only those), bronze numerals.
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    ...(
      [
        {
          id: 'packers-sleeve-gold-upper-left',
          surface: 'sleeve-left' as const,
          d: PACKERS_SLEEVE_GOLD_UPPER_LEFT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-gold-upper-right',
          surface: 'sleeve-right' as const,
          d: PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-white-left',
          surface: 'sleeve-left' as const,
          d: PACKERS_SLEEVE_WHITE_LEFT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-white-right',
          surface: 'sleeve-right' as const,
          d: PACKERS_SLEEVE_WHITE_RIGHT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-gold-lower-left',
          surface: 'sleeve-left' as const,
          d: PACKERS_SLEEVE_GOLD_LOWER_LEFT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-gold-lower-right',
          surface: 'sleeve-right' as const,
          d: PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
          fill: 'bronze',
        },
      ] as const
    ).map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' })),
    {
      id: 'packers-collar-outer',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'bronze',
      strokeWidth: PACKERS_COLLAR_WIDTHS.gold,
    },
    {
      id: 'packers-collar-mid',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'bronze',
      strokeWidth: PACKERS_COLLAR_WIDTHS.white,
    },
    {
      id: 'packers-collar-inner',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'bronze',
      strokeWidth: PACKERS_COLLAR_WIDTHS.goldInner,
    },
  ],
  number: { fill: 'bronze', outline: 'bronze', outlineWidth: 26 },
};

// Gold pants with the green/white/green stripe (home + away).
const PANTS_GOLD: UniformPart = { base: 'gold', layers: pantsStripes() };

// The 1923 throwback's leather pants, bare.
const PANTS_LEATHER: UniformPart = { base: 'leather', layers: [] };

// Winter Warning's white pants with the green/white/green stripe.
const PANTS_WHITE: UniformPart = { base: 'white', layers: pantsStripes() };

export const PACKERS_PARTS: TeamPartsDefinition = {
  teamId: 'packers',
  // Construction hexes from the module (teamcolorcodes + the sampled 1923 leather). Green, gold
  // and white are physical fixed colors the rows carry in different primary/secondary/accent
  // slots; the 1923 navy body and bronze trim have their own row tokens.
  palette: {
    green: '#203731',
    gold: '#FFB612',
    white: '#FFFFFF',
    // The 1923 leather shell and pants, sampled from the composite (no token; see packers.ts).
    leather: '#7B4A2A',
    // The modern gold/white shell's cage — mid-grey, sampled from the GUD composite (packers
    // current-season 2025, reads #8f8f90 at the gold shell's face opening). Named sources
    // describe the modern Packers mask as grey/light grey; the shared neutral #4b5158 it replaces
    // is a darker grey than the real cage. The 1923 leather shell predates the facemask and stays
    // on the default.
    cageGrey: '#8F8F90',
    // The 1923 navy body and bronze trim are the kit's own primary/secondary.
    navy: '#1B2C4E',
    bronze: '#CC8835',
  },
  helmets: { gold: HELMET_GOLD, leather: HELMET_LEATHER, white: HELMET_WHITE },
  jerseys: {
    green: JERSEY_GREEN,
    white: JERSEY_WHITE,
    navy: JERSEY_NAVY,
  },
  pants: { gold: PANTS_GOLD, leather: PANTS_LEATHER, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'gold', jersey: 'green', pants: 'gold' },
    away: { helmet: 'gold', jersey: 'white', pants: 'gold' },
    'winter-warning': { helmet: 'white', jersey: 'white', pants: 'white' },
    '1923-throwback': { helmet: 'leather', jersey: 'navy', pants: 'leather' },
  },
};

export const PACKERS_UNIFORMS_FROM_PARTS = compileParts(PACKERS_PARTS);
