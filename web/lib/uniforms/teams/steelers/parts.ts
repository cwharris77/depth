// Pittsburgh authored as composable parts. Geometry is imported unchanged from steelers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: home and away wear the SAME black shell (with the fixed
// hypocycloid decal) and the SAME gold pants with the black/white stripe set. The flat form
// reached the black shell through `secondary` at home and `accent` away, and the gold pants
// through `primary` at home and `secondary` away. Only the jersey body differs — black at home,
// white away. The bumblebee throwback is the genuinely different kit: a gold shell and a gold
// body under the black chevron-and-pinstripe panel, with khaki pants.
//
// The decal and the sleeve/pant stripe sets are fixed construction art (they do not recolor with
// the kit), so they are authored with palette literals rather than tokens.

import {
  STEELERS_BLACK,
  STEELERS_BUMBLEBEE_KHAKI,
  STEELERS_DECAL_BLUE,
  STEELERS_DECAL_BLUE_PATH,
  STEELERS_DECAL_DISC,
  STEELERS_DECAL_DISC_PATH,
  STEELERS_DECAL_GOLD,
  STEELERS_DECAL_GOLD_PATH,
  STEELERS_DECAL_RED,
  STEELERS_DECAL_RED_PATH,
  STEELERS_DECAL_RING,
  STEELERS_DECAL_RING_PATH,
  STEELERS_DECAL_SEPARATOR,
  STEELERS_DECAL_SEPARATOR_PATH,
  STEELERS_DECAL_WORDMARK,
  STEELERS_DECAL_WORDMARK_PATH,
  STEELERS_GOLD,
  STEELERS_PANTS_BLACK_LEFT,
  STEELERS_PANTS_BLACK_RIGHT,
  STEELERS_PANTS_WHITE_LEFT,
  STEELERS_PANTS_WHITE_RIGHT,
  STEELERS_SLEEVE_BACKING_LEFT,
  STEELERS_SLEEVE_BACKING_RIGHT,
  STEELERS_SLEEVE_GOLD_LOWER_LEFT,
  STEELERS_SLEEVE_GOLD_LOWER_RIGHT,
  STEELERS_SLEEVE_GOLD_UPPER_LEFT,
  STEELERS_SLEEVE_GOLD_UPPER_RIGHT,
  STEELERS_SLEEVE_WHITE_LEFT,
  STEELERS_SLEEVE_WHITE_RIGHT,
} from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';

export const fill = (
  id: string,
  surface:
    'helmet' | 'jersey' | 'collar' | 'sleeve-left' | 'sleeve-right' | 'leg-left' | 'leg-right',
  d: string,
  color: string
): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The complete source mark paints its white disc, grey ring, hypocycloids, separator, then
// wordmark. It is fixed art on the black shell, so every color is a palette literal.
const DECAL: PartLayer[] = [
  fill('steelers-decal-disc', 'helmet', STEELERS_DECAL_DISC_PATH, 'decalDisc'),
  fill('steelers-decal-ring', 'helmet', STEELERS_DECAL_RING_PATH, 'decalRing'),
  fill('steelers-decal-gold', 'helmet', STEELERS_DECAL_GOLD_PATH, 'decalGold'),
  fill('steelers-decal-red', 'helmet', STEELERS_DECAL_RED_PATH, 'decalRed'),
  fill('steelers-decal-blue', 'helmet', STEELERS_DECAL_BLUE_PATH, 'decalBlue'),
  fill('steelers-decal-separator', 'helmet', STEELERS_DECAL_SEPARATOR_PATH, 'decalSeparator'),
  fill('steelers-decal-wordmark', 'helmet', STEELERS_DECAL_WORDMARK_PATH, 'decalWordmark'),
];

// The sleeve stripe set — black backing with gold/white/gold bands. Fixed construction, shared by
// home and away, and identical on both (the backing's separators only become visible on the white
// body). The gold bands reuse the palette gold, not a token.
export function sleeveStripes(): PartLayer[] {
  return [
    fill('steelers-sleeve-backing-left', 'sleeve-left', STEELERS_SLEEVE_BACKING_LEFT, 'black'),
    fill('steelers-sleeve-backing-right', 'sleeve-right', STEELERS_SLEEVE_BACKING_RIGHT, 'black'),
    fill('steelers-sleeve-gold-upper-left', 'sleeve-left', STEELERS_SLEEVE_GOLD_UPPER_LEFT, 'gold'),
    fill(
      'steelers-sleeve-gold-upper-right',
      'sleeve-right',
      STEELERS_SLEEVE_GOLD_UPPER_RIGHT,
      'gold'
    ),
    fill('steelers-sleeve-white-left', 'sleeve-left', STEELERS_SLEEVE_WHITE_LEFT, 'white'),
    fill('steelers-sleeve-white-right', 'sleeve-right', STEELERS_SLEEVE_WHITE_RIGHT, 'white'),
    fill('steelers-sleeve-gold-lower-left', 'sleeve-left', STEELERS_SLEEVE_GOLD_LOWER_LEFT, 'gold'),
    fill(
      'steelers-sleeve-gold-lower-right',
      'sleeve-right',
      STEELERS_SLEEVE_GOLD_LOWER_RIGHT,
      'gold'
    ),
  ];
}

// Gold pants with the black stripe and white inset — the same physical pant for home and away.
function pantsStripes(): PartLayer[] {
  return [
    fill('steelers-pants-black-left', 'leg-left', STEELERS_PANTS_BLACK_LEFT, 'black'),
    fill('steelers-pants-black-right', 'leg-right', STEELERS_PANTS_BLACK_RIGHT, 'black'),
    fill('steelers-pants-white-left', 'leg-left', STEELERS_PANTS_WHITE_LEFT, 'white'),
    fill('steelers-pants-white-right', 'leg-right', STEELERS_PANTS_WHITE_RIGHT, 'white'),
  ];
}

// The black shell with the hypocycloid decal — one object, shared by home and away.
//
// Black cage. The Steelers' glossy black shell wears a black facemask (named sources; the
// composite cannot render a black cage on a black shell, so the named sources are the source of
// truth). The shared neutral #4b5158 it replaces is a grey that floats against the black shell.
const HELMET_BLACK: UniformPart = expandHelmet('steelers-black-helmet', {
  shell: 'black',
  facemask: 'black',
  decal: placed(DECAL),
  number: 'none',
});

// The bumblebee's gold shell, bare. Left on the default cage: the 1934 throwback's helmet
// predates the facemask, so there is no documented cage color to source, and the composite
// shows only the bare gold shell at this size.
const HELMET_GOLD: UniformPart = expandHelmet('steelers-gold-helmet', {
  shell: 'gold',
  facemask: 'neutral',
  decal: 'none',
  number: 'none',
});

// Home jersey: black body, the sleeve stripe set (fixed), white numerals ringed gold.

// Away jersey: white body, the same sleeve stripe set, black numerals ringed gold.

// The 1934 bumblebee jersey: gold body under the black chevron-and-pinstripe panel, gold collar.
// The pinstripes paint on the jersey surface so the gold collar still sits inside the chevron.

// Gold pants with the stripe set (home + away).
const PANTS_GOLD: UniformPart = { base: 'gold', layers: pantsStripes() };

// The bumblebee's khaki pants, unstriped.
const PANTS_KHAKI: UniformPart = { base: 'khaki', layers: [] };

export const STEELERS_PALETTE = {
  gold: STEELERS_GOLD,
  black: STEELERS_BLACK,
  white: '#FFFFFF',
  // The 1934 throwback's khaki pants have no token on any palette (sampled from the composite).
  khaki: STEELERS_BUMBLEBEE_KHAKI,
  // Exact source-mark colors, separate from the physical jersey/sleeve gold above.
  decalDisc: STEELERS_DECAL_DISC,
  decalRing: STEELERS_DECAL_RING,
  decalGold: STEELERS_DECAL_GOLD,
  decalRed: STEELERS_DECAL_RED,
  decalBlue: STEELERS_DECAL_BLUE,
  decalSeparator: STEELERS_DECAL_SEPARATOR,
  decalWordmark: STEELERS_DECAL_WORDMARK,
};
export const STEELERS_HELMETS = { black: HELMET_BLACK, gold: HELMET_GOLD };
export const STEELERS_PANTS = { gold: PANTS_GOLD, khaki: PANTS_KHAKI };
export const STEELERS_KITS = {
  home: { helmet: 'black', jersey: 'black', pants: 'gold' },
  away: { helmet: 'black', jersey: 'white', pants: 'gold' },
  bumblebee: { helmet: 'gold', jersey: 'bumblebee', pants: 'khaki' },
};
