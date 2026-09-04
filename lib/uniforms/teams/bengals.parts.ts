// Cincinnati authored as composable parts. Tiger-stripe geometry is imported unchanged from
// bengals.ts — this file only restates WHICH parts each kit combines, and names every color
// from the team palette instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: all four Bengals kits wear the SAME helmet (orange
// shell, black tiger stripes) and differ only in jersey and pants. The flat form spelled
// the helmet stripe and the sleeve stripe set out in every kit's override array, so the
// four kits carried the same geometry four times and nothing kept them in sync.
//
// The two "identity" quirks the parts palette resolves:
//   - Away and color-rush paint the orange shell through a literal '#FB4F14' in the flat
//     form, because their curated primary is white (the jersey base). Here it is one palette
//     entry shared by all four kits, and the question cannot arise.
//   - Home's jersey/pants body is black through the row's 'secondary', and color-rush's
//     knee accents are black through its 'secondary' too — both are the same physical color,
//     named once.

import {
  BENGALS_HELMET_STRIPE_PATH,
  BENGALS_PANTS_KNEE_ACCENT_LEFT,
  BENGALS_PANTS_KNEE_ACCENT_RIGHT,
  BENGALS_SLEEVE_STRIPE_PATH_LEFT,
  BENGALS_SLEEVE_STRIPE_PATH_RIGHT,
} from './bengals';
import {
  compileParts,
  fromGeneric,
  type PartLayer,
  type TeamPartsDefinition,
  type UniformPart,
} from './parts';
import type { UniformSurface } from './types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The tiger-stripe sleeve caps: the yoke carries the Bengals-specific tiger geometry from
// bengals.ts, while the horizontal band and the collar are the mannequin's own generic marks,
// re-painted under a palette color because parts are total — every generic layer is stripped,
// so a part that wants a generic mark must keep it explicitly via fromGeneric().
function sleeveStripes(stripe: string): PartLayer[] {
  return [
    fill('generic-sleeve-yoke-left', 'sleeve-left', BENGALS_SLEEVE_STRIPE_PATH_LEFT, stripe),
    fromGeneric('generic-sleeve-stripe-left', stripe),
    fill('generic-sleeve-yoke-right', 'sleeve-right', BENGALS_SLEEVE_STRIPE_PATH_RIGHT, stripe),
    fromGeneric('generic-sleeve-stripe-right', stripe),
    fromGeneric('generic-collar', stripe),
  ];
}

// Black cage, sampled from the GUD helmet composite (nfl-uniform-refs/bengals/bengals-home-black.png):
// the facemask bars read near-black (#1d1d1d-#252525) crossing the face opening over the white
// background, against the shell's #f23d22. Matches Cincinnati's real black cage — the shared
// neutral #4b5158 it replaces was a mid-grey mass at luminance ~84 over a shell at ~35, the
// brightest single element on the helmet.
const HELMET_ORANGE: UniformPart = {
  base: 'orange',
  facemask: 'black',
  layers: [fill('generic-helmet-stripe', 'helmet', BENGALS_HELMET_STRIPE_PATH, 'black')],
};

// Home jersey: black body, orange tiger sleeve caps.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: sleeveStripes('orange'),
  number: { fill: 'readable-on-body', outline: 'orange', outlineWidth: 26 },
};

// Away and color-rush jersey: white body, black tiger sleeve caps. Both rows resolve the
// sleeve stripes to the same #000000 even though away reaches it through a literal and
// color-rush through its 'secondary' — one part, one answer.
const JERSEY_WHITE_TIGER: UniformPart = {
  base: 'white',
  layers: sleeveStripes('black'),
  number: { fill: 'readable-on-body', outline: 'black', outlineWidth: 26 },
};

// Orange alternate jersey: orange body, black tiger sleeve caps.
const JERSEY_ORANGE_TIGER: UniformPart = {
  base: 'orange',
  layers: sleeveStripes('black'),
  number: { fill: 'readable-on-body', outline: 'black', outlineWidth: 26 },
};

// Plain black pants (home). Bengals kits do not carry the generic full-leg band.
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

// Plain white pants (away and orange alternate: away's white comes from primary, orange-alt's
// from accent — the same physical pant).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// White pants with the color-rush outer-knee claw accents (the only kit that wears them).
const PANTS_WHITE_CLAW: UniformPart = {
  base: 'white',
  layers: [
    fill('generic-pants-stripe-left', 'leg-left', BENGALS_PANTS_KNEE_ACCENT_LEFT, 'black'),
    fill('generic-pants-stripe-right', 'leg-right', BENGALS_PANTS_KNEE_ACCENT_RIGHT, 'black'),
  ],
};

export const BENGALS_PARTS: TeamPartsDefinition = {
  teamId: 'bengals',
  // Jersey hexes from the curated rows (teamcolorcodes); these are the three colors the rows
  // already carry across their four kits.
  palette: {
    orange: '#FB4F14',
    black: '#000000',
    white: '#FFFFFF',
  },
  helmets: { orange: HELMET_ORANGE },
  jerseys: {
    black: JERSEY_BLACK,
    'white-tiger': JERSEY_WHITE_TIGER,
    'orange-tiger': JERSEY_ORANGE_TIGER,
  },
  pants: {
    black: PANTS_BLACK,
    white: PANTS_WHITE,
    'white-claw': PANTS_WHITE_CLAW,
  },
  kits: {
    home: { helmet: 'orange', jersey: 'black', pants: 'black' },
    away: { helmet: 'orange', jersey: 'white-tiger', pants: 'white' },
    'orange-alt': { helmet: 'orange', jersey: 'orange-tiger', pants: 'white' },
    'color-rush': { helmet: 'orange', jersey: 'white-tiger', pants: 'white-claw' },
  },
};

export const BENGALS_UNIFORMS_FROM_PARTS = compileParts(BENGALS_PARTS);
