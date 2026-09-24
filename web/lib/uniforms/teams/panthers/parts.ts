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
// Pants are four parts, not one. The composite draws the leg stripe in a swatch beside each figure rather
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
} from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { fromGeneric, type PartLayer, type UniformPart } from '../core/parts';

// Wider triangle first, shorter one over it — the gap left below the middle band's point is where
// the two outer bands merge in the reference.
export function shoulderFan(outer: string, middle: string): PartLayer[] {
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

export function collar(fill: string): PartLayer[] {
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
export function decal(): PartLayer[] {
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
export function legStripe(keyline: string, center: string): PartLayer[] {
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
// black on every figure of the 2025 composite (nfl-uniform-refs/panthers), on both shells.
export const HELMET_BLACK: UniformPart = expandHelmet('panthers-black-helmet', {
  shell: 'black',
  facemask: 'black',
  decal: placed(decal()),
  number: 'none',
});

// Away and black-alternate shell (H2): silver, same mark, same black cage.
export const HELMET_SILVER: UniformPart = expandHelmet('panthers-silver-helmet', {
  shell: 'silver',
  facemask: 'black',
  decal: placed(decal()),
  number: 'none',
});

// The four legs. Every stripe is a blue centre between white keylines, except on blue pants where
// it inverts to black-on-blue and on silver where the keyline reads black against the light leg.
export const PANTS_BLACK: UniformPart = { base: 'black', layers: legStripe('white', 'blue') };
export const PANTS_BLUE: UniformPart = { base: 'blue', layers: legStripe('white', 'black') };
export const PANTS_WHITE: UniformPart = { base: 'white', layers: legStripe('black', 'blue') };
export const PANTS_SILVER: UniformPart = { base: 'silver', layers: legStripe('black', 'blue') };
