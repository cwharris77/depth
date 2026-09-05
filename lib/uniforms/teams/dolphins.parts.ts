// Miami authored as composable parts. Geometry is imported unchanged from dolphins.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// The four kits are NOT one construction: home and away carry no sleeve trim at all; the 1972
// throwback carries a five-band sleeve set (white over orange) and a TEAL crown stripe; Rivalries
// carries a teal wedge with an orange slash plus an orange collar V. All four wear a helmet crown
// stripe (the one thing they share). The decal is the sunburst in the current kits and the broken
// teal dolphin/ring in the throwback.
//
// The kits combine three helmets (white shell, navy rivalries shell, white throwback shell with a
// teal stripe), four jerseys (teal, white, navy, teal-with-bands), and three pants (white shared by
// home + 1972, teal, navy).

import { HELMET_CROWN_STRIPE_PATH } from './shared';
import {
  DOLPHINS_COLLAR_PATH,
  DOLPHINS_COLLAR_WIDTH,
  DOLPHINS_DECAL_DOLPHIN_PATH,
  DOLPHINS_DECAL_SUNBURST_PATH,
  DOLPHINS_SLASH_LEFT,
  DOLPHINS_SLASH_RIGHT,
  DOLPHINS_SLASH_WIDTH,
  DOLPHINS_SLEEVE_X_LEFT,
  DOLPHINS_SLEEVE_X_RIGHT,
  DOLPHINS_TB_DECAL_DOLPHIN_PATH,
  DOLPHINS_TB_DECAL_RING_PATH,
  DOLPHINS_TB_STRIPE_BOUNDS,
  DOLPHINS_WEDGE_LEFT,
  DOLPHINS_WEDGE_RIGHT,
} from './dolphins';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The crown-hugging helmet stripe all four kits wear (shared geometry from ./shared).
function crownStripe(color: string): PartLayer[] {
  return [
    {
      id: 'dolphins-crown-stripe',
      surface: 'helmet',
      d: HELMET_CROWN_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// Orange element first, dolphin over it — the paint order every trimmed mark here uses.
function decal(ring: string, dolphin: string, throwback = false): PartLayer[] {
  return [
    {
      id: 'dolphins-decal-ring',
      surface: 'helmet',
      d: throwback ? DOLPHINS_TB_DECAL_RING_PATH : DOLPHINS_DECAL_SUNBURST_PATH,
      clip: true,
      kind: 'fill',
      fill: ring,
    },
    {
      id: 'dolphins-decal-dolphin',
      surface: 'helmet',
      d: throwback ? DOLPHINS_TB_DECAL_DOLPHIN_PATH : DOLPHINS_DECAL_DOLPHIN_PATH,
      clip: true,
      kind: 'fill',
      fill: dolphin,
    },
  ];
}

// The 1972 five-band sleeve set (white over orange).
function throwbackStripes(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', DOLPHINS_SLEEVE_X_LEFT],
    ['sleeve-right', DOLPHINS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < DOLPHINS_TB_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = DOLPHINS_TB_STRIPE_BOUNDS[i];
    const bottom = DOLPHINS_TB_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `dolphins-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? band : line,
      });
    }
  }
  return out;
}

// The white shell with an orange crown stripe + sunburst (H1) — shared by home and away.
//
// White cage. The white Dolphins shell wears a white facemask (named sources — Miami is a classic
// white-cage team).
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: [...crownStripe('orange'), ...decal('orange', 'teal')],
};

// The navy rivalries shell (H2) with the orange stripe + sunburst.
const HELMET_NAVY: UniformPart = {
  base: 'navy',
  facemask: 'white',
  layers: [...crownStripe('orange'), ...decal('orange', 'teal')],
};

// The 1972 throwback shell (H3): white with a TEAL crown stripe and the broken-ring dolphin.
const HELMET_WHITE_1972: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: [...crownStripe('teal'), ...decal('orange', 'teal', true)],
};

// Home jersey (J1): teal body, no sleeve trim, white numerals keylined orange.
const JERSEY_TEAL: UniformPart = {
  base: 'teal',
  layers: [],
  number: { fill: 'white', outline: 'orange', outlineWidth: 14 },
};

// Away jersey (J2): white body, no sleeve trim, teal numerals keylined orange.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [],
  number: { fill: 'teal', outline: 'orange', outlineWidth: 14 },
};

// Navy rivalries jersey (J3): navy body, teal wedge + orange slash + orange collar V, teal numerals.
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    {
      id: 'dolphins-wedge-left',
      surface: 'sleeve-left',
      d: DOLPHINS_WEDGE_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'teal',
    },
    {
      id: 'dolphins-wedge-right',
      surface: 'sleeve-right',
      d: DOLPHINS_WEDGE_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'teal',
    },
    {
      id: 'dolphins-slash-left',
      surface: 'sleeve-left',
      d: DOLPHINS_SLASH_LEFT,
      clip: true,
      kind: 'stroke',
      stroke: 'orange',
      strokeWidth: DOLPHINS_SLASH_WIDTH,
    },
    {
      id: 'dolphins-slash-right',
      surface: 'sleeve-right',
      d: DOLPHINS_SLASH_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke: 'orange',
      strokeWidth: DOLPHINS_SLASH_WIDTH,
    },
    {
      id: 'dolphins-collar',
      surface: 'collar',
      d: DOLPHINS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'orange',
      strokeWidth: DOLPHINS_COLLAR_WIDTH,
    },
  ],
  number: { fill: 'teal', outline: 'teal', outlineWidth: 10 },
};

// 1972 throwback jersey (J4): teal body, five-band sleeve set, white numerals keylined orange.
const JERSEY_1972: UniformPart = {
  base: 'teal',
  layers: throwbackStripes('white', 'orange'),
  number: { fill: 'white', outline: 'orange', outlineWidth: 16 },
};

// White pants (P1, shared by home + 1972).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Teal pants (P2, away).
const PANTS_TEAL: UniformPart = { base: 'teal', layers: [] };

// Navy pants (P3, rivalries).
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };

export const DOLPHINS_PARTS: TeamPartsDefinition = {
  teamId: 'dolphins',
  // Jersey hexes from the curated rows (teamcolorcodes). Teal/orange/white/navy are the physical
  // body colors carried in different primary/secondary/accent slots per row.
  palette: {
    teal: '#008E97',
    orange: '#FC4C02',
    white: '#FFFFFF',
    navy: '#101820',
  },
  helmets: { white: HELMET_WHITE, navy: HELMET_NAVY, white1972: HELMET_WHITE_1972 },
  jerseys: {
    teal: JERSEY_TEAL,
    white: JERSEY_WHITE,
    navy: JERSEY_NAVY,
    '1972': JERSEY_1972,
  },
  pants: { white: PANTS_WHITE, teal: PANTS_TEAL, navy: PANTS_NAVY },
  kits: {
    home: { helmet: 'white', jersey: 'teal', pants: 'white' },
    away: { helmet: 'white', jersey: 'white', pants: 'teal' },
    'rivalries-2025': { helmet: 'navy', jersey: 'navy', pants: 'navy' },
    '1972-throwback': { helmet: 'white1972', jersey: '1972', pants: 'white' },
  },
};

export const DOLPHINS_UNIFORMS_FROM_PARTS = compileParts(DOLPHINS_PARTS);
