// Atlanta's shared helmet, jerseys and pants for the native uniform archive (DEP-478).
// The four-color falcon is fixed helmet art. Home and away retain canonical black pants
// while exposing the reference's white option; the historical red alternate remains black.
// Colors belong to named parts, independent of the jersey-relative palette slots.

import {
  FALCONS_DECAL_BODY_PATH,
  FALCONS_DECAL_SILVER_PATH,
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
    fill('falcons-decal-silver', 'helmet', FALCONS_DECAL_SILVER_PATH, 'silver'),
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

// The 2025 reference side swatch has a tapered red center with black keylines. Follow the
// mannequin leg edge and stop at the pant hem (y=1196), before the socks begin.
function pantsStripes(): PartLayer[] {
  return [
    fill(
      'falcons-pants-backing-left',
      'leg-left',
      'M170,807 L178,807 L158,918 L143,932 L132,1050 L143,1082 L143,1100 L136,1134 L136,1196 L120,1196 L120,1134 L127,1100 L127,1082 L116,1050 L127,928 L142,914 Z',
      'black'
    ),
    fill(
      'falcons-pants-backing-right',
      'leg-right',
      'M418,807 L410,807 L430,918 L445,932 L456,1050 L445,1082 L445,1100 L452,1134 L452,1196 L468,1196 L468,1134 L461,1100 L461,1082 L472,1050 L461,928 L446,914 Z',
      'black'
    ),
    fill(
      'falcons-pants-stripe-left',
      'leg-left',
      'M173,807 L175,807 L154,918 L139,932 L129,1050 L138,1082 L138,1100 L132,1134 L129,1196 L127,1196 L124,1134 L132,1100 L132,1082 L121,1050 L132,928 L146,914 Z',
      'red'
    ),
    fill(
      'falcons-pants-stripe-right',
      'leg-right',
      'M415,807 L413,807 L434,918 L449,932 L459,1050 L450,1082 L450,1100 L456,1134 L459,1196 L461,1196 L464,1134 L456,1100 L456,1082 L467,1050 L456,928 L442,914 Z',
      'red'
    ),
  ];
}

// Black pants are canonical; white pants are the alternate option shown with the same side seam.
const PANTS_BLACK: UniformPart = { base: 'black', layers: pantsStripes() };
const PANTS_WHITE: UniformPart = { base: 'white', layers: pantsStripes() };

export const FALCONS_PARTS: TeamPartsDefinition = {
  teamId: 'falcons',
  // Jersey hexes from the curated rows (teamcolorcodes); the away and red-alt rows share this
  // same palette through different primary/secondary/accent slots, which is the point. `silver`
  // also supplies the decal outer border. The 2020 "back to black" redesign's matte shell carries a
  // silver/chrome cage (atlantafalcons.com unveiling, 2020; still current in the 2026 redesign),
  // and the GUD composite renders it as the mid-grey #909090 at 8-bit. Silver is Falcons silver
  // PMS 877 C / #A5ACAF (teamcolorcodes).
  palette: {
    black: '#000000',
    white: '#FFFFFF',
    // The brand red trailing the side piping and numerals — the same physical color whether it
    // reaches home through 'primary' or away/red-alt through their own tokens.
    red: '#A71930',
    // The standalone mark supplies its fixed red independently of kit palette roles.
    decalRed: FALCONS_DECAL_RED,
    silver: '#A5ACAF',
  },
  helmets: { 'black-falcon': HELMET_BLACK_FALCON },
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
    red: JERSEY_RED,
  },
  pants: { black: PANTS_BLACK, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'black-falcon', jersey: 'black', pants: ['black', 'white'] },
    away: { helmet: 'black-falcon', jersey: 'white', pants: ['black', 'white'] },
    'red-alt': { helmet: 'black-falcon', jersey: 'red', pants: 'black' },
  },
};

export const FALCONS_UNIFORMS_FROM_PARTS = compileParts(FALCONS_PARTS);
