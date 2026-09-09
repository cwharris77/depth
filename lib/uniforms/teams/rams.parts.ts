// Los Angeles authored as composable parts. Geometry is imported unchanged from rams.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// Every kit is the same construction: the horn on the shell, a widening band with a tail on each
// sleeve, and a keylined stripe on each pant leg. No helmet stripe, no collar trim. What changes
// between kits is only which colors paint it — except on Rivalries, where the tail is royal against
// a yellow band rather than matching it.
//
// The measured target is 2 helmet / 4 jersey / 4 pants, and that is what this factors to. The
// helmet saving is the interesting one: home, away and bone all wear the SAME royal shell with the
// SAME gold horn, but the flat definition reached it three different ways — the implicit `primary`
// at home, `secondary` on the other two for the shell, and `secondary` vs `accent` for the horn —
// because royal and gold slide across tokens as the kit rows change. One part now.
//
// Two golds and two blues are real here and stay distinct: the modern gold #FFA300 and Rivalries'
// yellow #FFD100, the club royal #003594 and Rivalries' near-black navy #0D1B3E.

import {
  RAMS_DECAL_HORN_PATH,
  RAMS_SLEEVE_BAND_LEFT,
  RAMS_SLEEVE_BAND_RIGHT,
  RAMS_SLEEVE_TAIL_LEFT,
  RAMS_SLEEVE_TAIL_RIGHT,
  RAMS_STRIPE_BAND_LEFT,
  RAMS_STRIPE_BAND_RIGHT,
} from './rams';
import {
  compileParts,
  fromGeneric,
  type PartLayer,
  type TeamPartsDefinition,
  type UniformPart,
} from './parts';
import type { UniformSurface } from './types';

// Band and tail take separate colors because Rivalries is the one kit where they differ.
function sleeveMark(band: string, tail: string): PartLayer[] {
  const shapes: [string, UniformSurface, string, string][] = [
    ['rams-sleeve-band-left', 'sleeve-left', RAMS_SLEEVE_BAND_LEFT, band],
    ['rams-sleeve-band-right', 'sleeve-right', RAMS_SLEEVE_BAND_RIGHT, band],
    ['rams-sleeve-tail-left', 'sleeve-left', RAMS_SLEEVE_TAIL_LEFT, tail],
    ['rams-sleeve-tail-right', 'sleeve-right', RAMS_SLEEVE_TAIL_RIGHT, tail],
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

function horn(fill: string): PartLayer[] {
  return [
    {
      id: 'rams-decal-horn',
      surface: 'helmet',
      d: RAMS_DECAL_HORN_PATH,
      clip: true,
      kind: 'fill',
      fill,
    },
  ];
}

// The royal shell (H1) — home, away and bone all wear it with the gold horn. The cage is royal
// too: every blue-shell figure on the GUD 2025 composite (nfl-uniform-refs/rams) wears a facemask
// painted the shell color rather than a neutral cage.
const HELMET_ROYAL: UniformPart = { base: 'royal', facemask: 'royal', layers: horn('gold') };

// The Rivalries shell (H2): near-black navy with the yellow horn, and a cage painted to match the
// shell exactly as the blue helmets are.
const HELMET_RIVALRIES: UniformPart = { base: 'navy', facemask: 'navy', layers: horn('yellow') };

// Home jersey (J1): royal body, gold band and tail, gold numerals with a white keyline.
const JERSEY_ROYAL: UniformPart = {
  base: 'royal',
  layers: sleeveMark('gold', 'gold'),
  number: { fill: 'gold', outline: 'white', outlineWidth: 14 },
};

// Away jersey (J2): white body, the same gold sleeve mark, royal numerals keylined gold.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveMark('gold', 'gold'),
  number: { fill: 'royal', outline: 'gold', outlineWidth: 14 },
};

// Bone jersey (J3): bone body, otherwise identical to away — which is why only the body color and
// the pants separate the two kits.
const JERSEY_BONE: UniformPart = {
  base: 'bone',
  layers: sleeveMark('gold', 'gold'),
  number: { fill: 'royal', outline: 'gold', outlineWidth: 14 },
};

// Rivalries jersey (J4): near-black body, and the one kit whose sleeve tail breaks from its band —
// royal against yellow rather than matching.
const JERSEY_RIVALRIES: UniformPart = {
  base: 'navy',
  layers: sleeveMark('yellow', 'royal'),
  number: { fill: 'white', outline: 'royal', outlineWidth: 14 },
};

// Every leg carries a keylined stripe: the mannequin's own 16-unit generic band painted as the
// OUTER keyline, with the inboard 11 units painted over it. See rams.ts for the swatch measurement
// this comes from — the figures themselves render the legs flat, so reading them alone is what made
// an earlier pass record these pants as unbroken.
function legStripe(keyline: string, band: string): PartLayer[] {
  return [
    fromGeneric('generic-pants-stripe-left', keyline),
    fromGeneric('generic-pants-stripe-right', keyline),
    {
      id: 'rams-stripe-band-left',
      surface: 'leg-left',
      d: RAMS_STRIPE_BAND_LEFT,
      clip: true,
      kind: 'fill',
      fill: band,
    },
    {
      id: 'rams-stripe-band-right',
      surface: 'leg-right',
      d: RAMS_STRIPE_BAND_RIGHT,
      clip: true,
      kind: 'fill',
      fill: band,
    },
  ];
}

// Pants — four colors, so four parts. The keyline is the modern gold on bone and Rivalries' own
// yellow on black, which the composite cannot tell apart; each takes the token the rest of its kit
// is authored in. Royal legs are the exception to the two-band shape: their stripe is a single
// white-to-gold vertical ramp with no separate keyline, flattened here to plain white, so both the
// generic band and the band over it take the same color.
const PANTS_GOLD: UniformPart = { base: 'gold', layers: legStripe('white', 'royal') };
const PANTS_ROYAL: UniformPart = { base: 'royal', layers: legStripe('white', 'white') };
const PANTS_BONE: UniformPart = { base: 'bone', layers: legStripe('gold', 'white') };
const PANTS_NAVY: UniformPart = { base: 'navy', layers: legStripe('yellow', 'royal') };

export const RAMS_PARTS: TeamPartsDefinition = {
  teamId: 'rams',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). `royal` is also the club's
  // published royal, which is what the reference renders for the Rivalries sleeve tail.
  palette: {
    royal: '#003594',
    gold: '#FFA300',
    navy: '#0D1B3E',
    yellow: '#FFD100',
    bone: '#F0EBE0',
    white: '#FFFFFF',
  },
  helmets: { royal: HELMET_ROYAL, rivalries: HELMET_RIVALRIES },
  jerseys: {
    royal: JERSEY_ROYAL,
    white: JERSEY_WHITE,
    bone: JERSEY_BONE,
    rivalries: JERSEY_RIVALRIES,
  },
  pants: { gold: PANTS_GOLD, royal: PANTS_ROYAL, bone: PANTS_BONE, navy: PANTS_NAVY },
  // Pants options per kit, canonical first — only the first compiles today, so the shipped raster is
  // unchanged and the rest are declarative until the archive UI lands. Enumerated from the 2025
  // composite: the royal jersey is worn with gold and with bone legs, the white jersey with royal and
  // with gold. The sheet's blue-boxed royal-on-royal pair is labelled "Worn in Preseason only" and is
  // therefore not an option here, the same call the Carolina pass made.
  kits: {
    home: { helmet: 'royal', jersey: 'royal', pants: ['gold', 'bone'] },
    away: { helmet: 'royal', jersey: 'white', pants: ['royal', 'gold'] },
    bone: { helmet: 'royal', jersey: 'bone', pants: ['bone'] },
    'rivalries-2025': { helmet: 'rivalries', jersey: 'rivalries', pants: ['navy'] },
  },
};

export const RAMS_UNIFORMS_FROM_PARTS = compileParts(RAMS_PARTS);
