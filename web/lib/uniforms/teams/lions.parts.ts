// Detroit authored as composable parts. Geometry is imported unchanged from lions.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// The construction is one four-band stripe set floating on the outer third of each sleeve, and a
// leaping-lion decal (white keyline, blue body). All three kits wear the SAME silver shell with
// the lion. The body and pants do vary: home is a blue body over (default) blue pants, away a
// white body over silver pants (accent), and gridiron-gray a silver body over silver pants
// (primary) — so the two shared pant parts are blue (home) and silver (away + gridiron).

import {
  LIONS_DECAL_BODY_PATH,
  LIONS_DECAL_KEYLINE_PATH,
  LIONS_SLEEVE_X_LEFT,
  LIONS_SLEEVE_X_RIGHT,
  LIONS_STRIPE_BOUNDS,
} from './lions';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// Four contiguous sleeve bands, outer color and inner color alternating from the top down.
function sleeveStripes(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', LIONS_SLEEVE_X_LEFT],
    ['sleeve-right', LIONS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < LIONS_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = LIONS_STRIPE_BOUNDS[i];
    const bottom = LIONS_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `lions-sleeve-band-${i}-${side}`,
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

// The silver shell with the leaping-lion decal (white keyline, then the blue body over it) — one
// object, shared by every kit. The keyline is the body mask grown by nine upsampled px, not a
// traced ring (see lions.ts).
//
// Silver cage. The modern silver shell wears a silver facemask (named sources: "silver
// polyvinyl-coated steel face mask"); GUD cannot separate a silver cage from the same-toned shell,
// so the named source and the team's silver #B0B7BC are the source of truth here. The shared
// neutral #4b5158 it replaces is a dark grey that reads as a hole in the silver shell.
const HELMET_SILVER_LION: UniformPart = {
  base: 'silver',
  facemask: 'silver',
  layers: [
    {
      id: 'lions-decal-keyline',
      surface: 'helmet',
      d: LIONS_DECAL_KEYLINE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'lions-decal-body',
      surface: 'helmet',
      d: LIONS_DECAL_BODY_PATH,
      clip: true,
      kind: 'fill',
      fill: 'blue',
    },
  ],
};

// Home jersey: blue body, silver/white four-band set, white numerals.
const JERSEY_BLUE: UniformPart = {
  base: 'blue',
  layers: sleeveStripes('silver', 'white'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey: white body, blue/silver four-band set (inverted), blue numerals. Band bounds are
// the home figure's — the two-kit approximation noted in lions.ts.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes('blue', 'silver'),
  number: { fill: 'blue', outline: 'blue', outlineWidth: 10 },
};

// Gridiron-gray jersey: silver body, blue/white four-band set, white numerals ringed blue.
// INFERRED — no silver jersey appears in the 2025 reference (see lions.ts).
const JERSEY_GRAY: UniformPart = {
  base: 'silver',
  layers: sleeveStripes('blue', 'white'),
  number: { fill: 'white', outline: 'blue', outlineWidth: 14 },
};

// Blue pants (home).
const PANTS_BLUE: UniformPart = { base: 'blue', layers: [] };

// Silver pants (away and gridiron — away reaches it through 'accent', gridiron through 'primary').
const PANTS_SILVER: UniformPart = { base: 'silver', layers: [] };

export const LIONS_PARTS: TeamPartsDefinition = {
  teamId: 'lions',
  // Jersey hexes from the curated rows (teamcolorcodes). Silver is the shell/body color that the
  // rows carry across different primary/secondary/accent slots; blue is home/away's shared body.
  palette: {
    blue: '#0076B6',
    white: '#FFFFFF',
    silver: '#B0B7BC',
  },
  helmets: { 'silver-lion': HELMET_SILVER_LION },
  jerseys: {
    blue: JERSEY_BLUE,
    white: JERSEY_WHITE,
    gray: JERSEY_GRAY,
  },
  pants: { blue: PANTS_BLUE, silver: PANTS_SILVER },
  kits: {
    home: { helmet: 'silver-lion', jersey: 'blue', pants: 'blue' },
    away: { helmet: 'silver-lion', jersey: 'white', pants: 'silver' },
    'gridiron-gray': { helmet: 'silver-lion', jersey: 'gray', pants: 'silver' },
  },
};

export const LIONS_UNIFORMS_FROM_PARTS = compileParts(LIONS_PARTS);
