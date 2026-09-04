// Atlanta authored as composable parts. Geometry is imported unchanged from falcons.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: all three Atlanta kits wear the SAME helmet (black shell,
// the fixed white/black/red falcon decal) and the SAME black pants, and differ only in the
// jersey. The flat form spelled the helmet decal and the side-seam piping set out in every kit's
// layer array, three times over.
//
// The away kit's black shell/pants come through a literal '#000000' in the flat form because its
// curated palette resolves secondary AND accent to the brand red (#A71930); here it is one palette
// entry shared by all three kits, and the question cannot arise.

import {
  FALCONS_DECAL_BODY_PATH,
  FALCONS_DECAL_RED,
  FALCONS_DECAL_SILHOUETTE_PATH,
  FALCONS_DECAL_STREAKS_PATH,
  FALCONS_SIDE_STRIPE_LEFT,
  FALCONS_SIDE_STRIPE_RIGHT,
} from './falcons';
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

// The side-seam piping pair, shared by every jersey.
function sideStripes(color: string): PartLayer[] {
  return [
    fill('falcons-side-stripe-left', 'jersey', FALCONS_SIDE_STRIPE_LEFT, color),
    fill('falcons-side-stripe-right', 'jersey', FALCONS_SIDE_STRIPE_RIGHT, color),
  ];
}

// The falcon decal is fixed art on the black shell — nothing here moves with the palette, so it
// lives entirely inside the (single) helmet part rather than being restated per kit. The black
// shell's silver cage is the 2020 redesign's "back to black" facemask (see palette note).
const HELMET_BLACK_FALCON: UniformPart = {
  base: 'black',
  facemask: 'silver',
  layers: [
    fill('falcons-decal-silhouette', 'helmet', FALCONS_DECAL_SILHOUETTE_PATH, 'white'),
    fill('falcons-decal-body', 'helmet', FALCONS_DECAL_BODY_PATH, 'black'),
    fill('falcons-decal-streaks', 'helmet', FALCONS_DECAL_STREAKS_PATH, 'decalRed'),
  ],
};

// Home jersey: black body, red side piping, white numerals ringed in red (thin 10px keyline).
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: sideStripes('red'),
  number: { fill: 'white', outline: 'red', outlineWidth: 10 },
};

// Away jersey: white body, red side piping, black numerals ringed in red. The black number fill
// is a literal in the flat form (no token supplies it on the away row); here it is the palette.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sideStripes('red'),
  number: { fill: 'black', outline: 'red', outlineWidth: 10 },
};

// Red alternate jersey: red body, white side piping, white numerals ringed in black. Inferred
// construction (no red kit in the 2025 composite), same caveat as the flat form.
const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: sideStripes('white'),
  number: { fill: 'white', outline: 'black', outlineWidth: 10 },
};

// Plain black pants. Atlanta's construction is the sparest of any team: no stripe, no band.
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const FALCONS_PARTS: TeamPartsDefinition = {
  teamId: 'falcons',
  // Jersey hexes from the curated rows (teamcolorcodes); the away and red-alt rows share this
  // same palette through different primary/secondary/accent slots, which is the point. `silver`
  // is the facemask color only — the 2020 "back to black" redesign's matte shell carries a
  // silver/chrome cage (atlantafalcons.com unveiling, 2020; still current in the 2026 redesign),
  // and the GUD composite renders it as the mid-grey #909090 at 8-bit. Silver is Falcons silver
  // PMS 877 C / #A5ACAF (teamcolorcodes).
  palette: {
    black: '#000000',
    white: '#FFFFFF',
    // The brand red trailing the side piping and numerals — the same physical color whether it
    // reaches home through 'primary' or away/red-alt through their own tokens.
    red: '#A71930',
    // The decal's red streak, a fixed-art sampled color distinct from the jersey red.
    decalRed: FALCONS_DECAL_RED,
    silver: '#A5ACAF',
  },
  helmets: { 'black-falcon': HELMET_BLACK_FALCON },
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
    red: JERSEY_RED,
  },
  pants: { black: PANTS_BLACK },
  kits: {
    home: { helmet: 'black-falcon', jersey: 'black', pants: 'black' },
    away: { helmet: 'black-falcon', jersey: 'white', pants: 'black' },
    'red-alt': { helmet: 'black-falcon', jersey: 'red', pants: 'black' },
  },
};

export const FALCONS_UNIFORMS_FROM_PARTS = compileParts(FALCONS_PARTS);
