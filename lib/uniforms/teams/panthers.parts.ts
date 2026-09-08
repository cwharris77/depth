// Carolina authored as composable parts. Geometry is imported unchanged from panthers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// All three kits are ONE construction with the tokens swapped: the panther on the shell, a deep
// V-collar, and on each shoulder a fan of three tapering wedges authored as a wider triangle with
// a shorter one painted over it. No helmet stripe.
//
// The migration's measured target was 2 helmet / 3 jersey / 1 pants, and that is what it factored
// to. Both savings are real and neither is visible in the flat form. The away and black-alternate
// kits wear the SAME silver shell with the SAME mark, but the flat definition reached the silver
// two different ways — a literal on the away kit, `accent` on the black alternate — because silver
// only enters the palette on one of them. One part now. The single black pants part was likewise
// `secondary` at home, `accent` away, and the implicit `primary` on the black alternate; it is
// still the canonical leg on all three, and now carries the three options beside it (below).
//
// The mark is four layers on every shell (see ./panthers.ts for the measured topology): a blue
// silhouette, the black body over it, the blue interior gaps painted back on top, then the grey
// fangs. On the home kit's black shell the black body disappears into the shell and the mark reads
// as blue linework alone, exactly as the reference draws it on that helmet — that is why the home
// helmet stays a separate part despite carrying identical decal colors.
//
// Pants are four parts, not one. GUD draws the leg stripe in a swatch beside each figure rather
// than on the figure, so an earlier pass read every pant as unbroken black; the composite actually
// gives Carolina black, blue, white and silver legs, each with the same keylined stripe. Each kit
// carries the list it is worn with, canonical (black, the pairing the archive already ships) first.

import {
  PANTHERS_DECAL_BODY_PATH,
  PANTHERS_DECAL_DETAIL_PATH,
  PANTHERS_DECAL_HIGHLIGHT_PATH,
  PANTHERS_DECAL_KEYLINE_PATH,
  PANTHERS_STRIPE_CENTER_LEFT,
  PANTHERS_STRIPE_CENTER_RIGHT,
  PANTHERS_FAN_LEFT,
  PANTHERS_FAN_RIGHT,
  PANTHERS_WEDGE_LEFT,
  PANTHERS_WEDGE_RIGHT,
  PANTHERS_COLLAR_PATH,
  PANTHERS_COLLAR_WIDTH,
} from './panthers';
import {
  compileParts,
  fromGeneric,
  type PartLayer,
  type TeamPartsDefinition,
  type UniformPart,
} from './parts';

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

// Paint order is the whole trick: silhouette, body, the body's interior gaps back in blue, fangs.
// Reversing any pair loses the linework the last pass was missing entirely.
function decal(): PartLayer[] {
  const shapes: [string, string, string][] = [
    ['panthers-decal-keyline', PANTHERS_DECAL_KEYLINE_PATH, 'blue'],
    ['panthers-decal-body', PANTHERS_DECAL_BODY_PATH, 'black'],
    ['panthers-decal-detail', PANTHERS_DECAL_DETAIL_PATH, 'blue'],
    ['panthers-decal-highlight', PANTHERS_DECAL_HIGHLIGHT_PATH, 'markSilver'],
  ];
  return shapes.map(([id, d, fill]) => ({
    id,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

// The leg stripe: the mannequin's own 16-unit band as the keyline, the measured 82% centre over it.
function legStripe(keyline: string, center: string): PartLayer[] {
  return [
    fromGeneric('generic-pants-stripe-left', keyline),
    fromGeneric('generic-pants-stripe-right', keyline),
    {
      id: 'panthers-stripe-center-left',
      surface: 'leg-left',
      d: PANTHERS_STRIPE_CENTER_LEFT,
      clip: true,
      kind: 'fill',
      fill: center,
    },
    {
      id: 'panthers-stripe-center-right',
      surface: 'leg-right',
      d: PANTHERS_STRIPE_CENTER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: center,
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

// The four legs. Every stripe is a blue centre between white keylines, except on blue pants where
// it inverts to black-on-blue and on silver where the keyline reads black against the light leg.
const PANTS_BLACK: UniformPart = { base: 'black', layers: legStripe('white', 'blue') };
const PANTS_BLUE: UniformPart = { base: 'blue', layers: legStripe('white', 'black') };
const PANTS_WHITE: UniformPart = { base: 'white', layers: legStripe('black', 'blue') };
const PANTS_SILVER: UniformPart = { base: 'silver', layers: legStripe('black', 'blue') };

export const PANTHERS_PARTS: TeamPartsDefinition = {
  teamId: 'panthers',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). Silver is the hex the archive
  // already stores as this club's black-alternate accent.
  palette: {
    blue: '#0085CA',
    black: '#101820',
    silver: '#A5ACAF',
    white: '#FFFFFF',
    // The mark's own highlight grey, read straight off the reference SVG rather than borrowed from
    // the kit's silver: fixed art does not recolour with the kit.
    markSilver: '#BFC0BF',
  },
  helmets: { black: HELMET_BLACK, silver: HELMET_SILVER },
  jerseys: { blue: JERSEY_BLUE, white: JERSEY_WHITE, black: JERSEY_BLACK },
  pants: { black: PANTS_BLACK, blue: PANTS_BLUE, white: PANTS_WHITE, silver: PANTS_SILVER },
  // Pant options enumerated from the 2025 composite, excluding its preseason-only block: the blue
  // jersey is worn with black and blue legs; the white jersey with black, white, blue and silver;
  // the black jersey with black and silver.
  kits: {
    home: { helmet: 'black', jersey: 'blue', pants: ['black', 'blue'] },
    away: { helmet: 'silver', jersey: 'white', pants: ['black', 'white', 'blue', 'silver'] },
    'black-alt': { helmet: 'silver', jersey: 'black', pants: ['black', 'silver'] },
  },
};

export const PANTHERS_UNIFORMS_FROM_PARTS = compileParts(PANTHERS_PARTS);
