// Carolina authored as composable parts. Geometry is imported unchanged from panthers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// All three kits are ONE construction with the tokens swapped: the panther on the shell, a deep
// V-collar, and on each shoulder a fan of three tapering wedges authored as a wider triangle with
// a shorter one painted over it. No helmet stripe and no pant stripe.
//
// The measured target is 2 helmet / 3 jersey / 1 pants, and that is what this factors to. Both
// savings are real and neither is visible in the flat form. The away and black-alternate kits wear
// the SAME silver shell with the SAME blue-over-black mark, but the flat definition reached the
// silver two different ways — a literal on the away kit, `accent` on the black alternate — because
// silver only enters the palette on one of them. One part now. Pants are one part too: black on
// every kit, previously `secondary` at home, `accent` away, and the implicit `primary` on the
// black alternate.
//
// The mark is two layers on every shell: a blue silhouette under a black body, so the blue reads
// as the keyline it is. On the home kit's black shell the black body disappears into the shell and
// the blue silhouette reads alone, exactly as the reference draws it — that is why the home helmet
// is a separate part despite carrying identical decal colors.

import {
  PANTHERS_DECAL_BODY_PATH,
  PANTHERS_DECAL_SILHOUETTE_PATH,
  PANTHERS_FAN_LEFT,
  PANTHERS_FAN_RIGHT,
  PANTHERS_WEDGE_LEFT,
  PANTHERS_WEDGE_RIGHT,
  PANTHERS_COLLAR_PATH,
  PANTHERS_COLLAR_WIDTH,
} from './panthers';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

// Wider triangle first, shorter one over it — the gap left below the middle band's point is where
// the two outer bands merge in the reference.
function shoulderFan(outer: string, middle: string): PartLayer[] {
  const shapes: [string, 'sleeve-left' | 'sleeve-right', string, string][] = [
    ['panthers-fan-left', 'sleeve-left', PANTHERS_FAN_LEFT, outer],
    ['panthers-fan-right', 'sleeve-right', PANTHERS_FAN_RIGHT, outer],
    ['panthers-wedge-left', 'sleeve-left', PANTHERS_WEDGE_LEFT, middle],
    ['panthers-wedge-right', 'sleeve-right', PANTHERS_WEDGE_RIGHT, middle],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

function collar(fill: string): PartLayer[] {
  return [
    {
      id: 'panthers-collar',
      surface: 'collar',
      d: PANTHERS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: fill,
      strokeWidth: PANTHERS_COLLAR_WIDTH,
    },
  ];
}

// Blue silhouette under a black body, in that paint order — the same two colors on every shell.
function decal(): PartLayer[] {
  return [
    {
      id: 'panthers-decal-silhouette',
      surface: 'helmet',
      d: PANTHERS_DECAL_SILHOUETTE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'blue',
    },
    {
      id: 'panthers-decal-body',
      surface: 'helmet',
      d: PANTHERS_DECAL_BODY_PATH,
      clip: true,
      kind: 'fill',
      fill: 'black',
    },
  ];
}

// Home shell (H1): black, the only kit in the reference whose shell is not silver. The cage is
// black on every figure of the GUD 2025 composite (nfl-uniform-refs/panthers), on both shells.
const HELMET_BLACK: UniformPart = { base: 'black', facemask: 'black', layers: decal() };

// Away and black-alternate shell (H2): silver, same mark, same black cage.
const HELMET_SILVER: UniformPart = { base: 'silver', facemask: 'black', layers: decal() };

// Home jersey (J1): blue body, white-outside-black fan, black collar, white numerals.
const JERSEY_BLUE: UniformPart = {
  base: 'blue',
  layers: [...shoulderFan('white', 'black'), ...collar('black')],
  number: { fill: 'white', outline: 'black', outlineWidth: 14 },
};

// Away jersey (J2): white body, the fan inverted to black-outside-blue, black collar, black
// numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulderFan('black', 'blue'), ...collar('black')],
  number: { fill: 'black', outline: 'blue', outlineWidth: 14 },
};

// Black-alternate jersey (J3): black body, silver-outside-blue fan, blue collar, white numerals.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...shoulderFan('silver', 'blue'), ...collar('blue')],
  number: { fill: 'white', outline: 'blue', outlineWidth: 14 },
};

// The only pants (P1): black and unbroken on every kit.
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const PANTHERS_PARTS: TeamPartsDefinition = {
  teamId: 'panthers',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). Silver is the hex the archive
  // already stores as this club's black-alternate accent.
  palette: {
    blue: '#0085CA',
    black: '#101820',
    silver: '#A5ACAF',
    white: '#FFFFFF',
  },
  helmets: { black: HELMET_BLACK, silver: HELMET_SILVER },
  jerseys: { blue: JERSEY_BLUE, white: JERSEY_WHITE, black: JERSEY_BLACK },
  pants: { black: PANTS_BLACK },
  kits: {
    home: { helmet: 'black', jersey: 'blue', pants: 'black' },
    away: { helmet: 'silver', jersey: 'white', pants: 'black' },
    'black-alt': { helmet: 'silver', jersey: 'black', pants: 'black' },
  },
};

export const PANTHERS_UNIFORMS_FROM_PARTS = compileParts(PANTHERS_PARTS);
