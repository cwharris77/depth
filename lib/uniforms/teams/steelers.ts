import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Pittsburgh's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/steelers. Sleeve and pant paths use the outer 588-wide mannequin space; right
// paths mirror the left across the jersey centerline x=294 (mirroredX = 588 - x).
//
// No helmet decal. Pittsburgh's mark is the one case so far where tracing is the wrong call on
// both counts: it renders about 30px across in the reference, which traces to mush, and it embeds
// a wordmark, which the trademark boundary keeps out of the model regardless. Leaving the shell
// bare is more honest than shipping an illegible trace.

// Construction colors are fixed across kits — the sleeve stripe set does not recolor when the body
// changes black/white, and its black separators only become visible on the white away body.
// Official hexes from teamcolorcodes; GUD renders the gold as #FDD638, a step brighter.
export const STEELERS_GOLD = '#FFB612';
export const STEELERS_BLACK = '#101820';
// The 1934 throwback's khaki pants have no token on that kit's palette. Sampled from the composite.
export const STEELERS_BUMBLEBEE_KHAKI = '#D2C295';

// The sleeve stripe set, measured at x=21-38 on a reference figure centered at 102.5 and scaled
// into mannequin space. A black backing block spans the whole stack so the thin separators between
// the gold and white bands read on the white away jersey; on the black home body it is invisible,
// which is exactly what the reference shows.
export const STEELERS_SLEEVE_BACKING_LEFT = 'M30,470 H96 V551 H30 Z';
export const STEELERS_SLEEVE_BACKING_RIGHT = 'M492,470 H558 V551 H492 Z';
export const STEELERS_SLEEVE_GOLD_UPPER_LEFT = 'M30,473 H96 V486 H30 Z';
export const STEELERS_SLEEVE_GOLD_UPPER_RIGHT = 'M492,473 H558 V486 H492 Z';
export const STEELERS_SLEEVE_WHITE_LEFT = 'M30,491 H96 V500 H30 Z';
export const STEELERS_SLEEVE_WHITE_RIGHT = 'M492,491 H558 V500 H492 Z';
export const STEELERS_SLEEVE_GOLD_LOWER_LEFT = 'M30,506 H96 V548 H30 Z';
export const STEELERS_SLEEVE_GOLD_LOWER_RIGHT = 'M492,506 H558 V548 H492 Z';

// Gold pants carry a black stripe with a white stripe inset over it, reading black/white/black.
export const STEELERS_PANTS_BLACK_LEFT = 'M112,807 H140 V1462 H112 Z';
export const STEELERS_PANTS_BLACK_RIGHT = 'M448,807 H476 V1462 H448 Z';
export const STEELERS_PANTS_WHITE_LEFT = 'M122,807 H130 V1462 H122 Z';
export const STEELERS_PANTS_WHITE_RIGHT = 'M458,807 H466 V1462 H458 Z';

// The 1934 throwback is a gold body wearing a broad black chevron across the shoulders that runs
// into a black torso panel, itself pinstriped in gold at an 18px pitch in reference space (~57 in
// mannequin space). The chevron paints on the jersey surface so the kit's gold collar still sits
// inside it, matching the reference.
export const STEELERS_BUMBLEBEE_CHEVRON_PATH = 'M111,408 L294,548 L477,408';
export const STEELERS_BUMBLEBEE_CHEVRON_WIDTH = 56;
export const STEELERS_BUMBLEBEE_TORSO_PATH = 'M158,505 H433 V806 H158 Z';
export const STEELERS_BUMBLEBEE_PINSTRIPE_XS = [180, 236, 293, 346, 402];

const COLLAR_PATH = 'M206,388 L294,455 L386,388';
const GENERIC_STRIPPED = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
  'generic-collar',
  'generic-pants-stripe-left',
  'generic-pants-stripe-right',
];

function sleeveStripes(): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    {
      id: 'steelers-sleeve-backing-left',
      surface: 'sleeve-left',
      d: STEELERS_SLEEVE_BACKING_LEFT,
      fill: STEELERS_BLACK,
    },
    {
      id: 'steelers-sleeve-backing-right',
      surface: 'sleeve-right',
      d: STEELERS_SLEEVE_BACKING_RIGHT,
      fill: STEELERS_BLACK,
    },
    {
      id: 'steelers-sleeve-gold-upper-left',
      surface: 'sleeve-left',
      d: STEELERS_SLEEVE_GOLD_UPPER_LEFT,
      fill: STEELERS_GOLD,
    },
    {
      id: 'steelers-sleeve-gold-upper-right',
      surface: 'sleeve-right',
      d: STEELERS_SLEEVE_GOLD_UPPER_RIGHT,
      fill: STEELERS_GOLD,
    },
    {
      id: 'steelers-sleeve-white-left',
      surface: 'sleeve-left',
      d: STEELERS_SLEEVE_WHITE_LEFT,
      fill: '#FFFFFF',
    },
    {
      id: 'steelers-sleeve-white-right',
      surface: 'sleeve-right',
      d: STEELERS_SLEEVE_WHITE_RIGHT,
      fill: '#FFFFFF',
    },
    {
      id: 'steelers-sleeve-gold-lower-left',
      surface: 'sleeve-left',
      d: STEELERS_SLEEVE_GOLD_LOWER_LEFT,
      fill: STEELERS_GOLD,
    },
    {
      id: 'steelers-sleeve-gold-lower-right',
      surface: 'sleeve-right',
      d: STEELERS_SLEEVE_GOLD_LOWER_RIGHT,
      fill: STEELERS_GOLD,
    },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill' }));
}

function pantsStripes(): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    {
      id: 'steelers-pants-black-left',
      surface: 'leg-left',
      d: STEELERS_PANTS_BLACK_LEFT,
      fill: STEELERS_BLACK,
    },
    {
      id: 'steelers-pants-black-right',
      surface: 'leg-right',
      d: STEELERS_PANTS_BLACK_RIGHT,
      fill: STEELERS_BLACK,
    },
    {
      id: 'steelers-pants-white-left',
      surface: 'leg-left',
      d: STEELERS_PANTS_WHITE_LEFT,
      fill: '#FFFFFF',
    },
    {
      id: 'steelers-pants-white-right',
      surface: 'leg-right',
      d: STEELERS_PANTS_WHITE_RIGHT,
      fill: '#FFFFFF',
    },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill' }));
}

function bumblebeeLayers(): UniformLayer[] {
  const pinstripes: UniformLayer[] = STEELERS_BUMBLEBEE_PINSTRIPE_XS.map((x, i) => ({
    id: `steelers-bumblebee-pinstripe-${i}`,
    surface: 'jersey',
    d: `M${x},505 H${x + 6} V806 H${x} Z`,
    clip: true,
    kind: 'fill',
    fill: 'secondary',
  }));

  return [
    {
      id: 'steelers-bumblebee-torso',
      surface: 'jersey',
      d: STEELERS_BUMBLEBEE_TORSO_PATH,
      clip: true,
      kind: 'fill',
      fill: 'primary',
    },
    {
      id: 'steelers-bumblebee-chevron',
      surface: 'jersey',
      d: STEELERS_BUMBLEBEE_CHEVRON_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'primary',
      strokeWidth: STEELERS_BUMBLEBEE_CHEVRON_WIDTH,
    },
    ...pinstripes,
    {
      id: 'steelers-bumblebee-collar',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'secondary',
      strokeWidth: 13,
    },
  ];
}

export const STEELERS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'steelers',
  kits: {
    // ESPN gives Pittsburgh color=gold / alternateColor=black, so `toTeamColors` hands the home kit
    // primary #FFB612 — and the generic model paints helmet, jersey AND pants from primary, which
    // renders Pittsburgh head-to-toe gold. The reference is a black jersey over gold pants, so the
    // body and shell are pinned to secondary and only the pants keep primary. This is a rendering
    // fix in the definition rather than a data one: teams.colors is machine-owned (invariant 3).
    home: {
      helmetColor: 'secondary',
      jerseyColor: 'secondary',
      pantsColor: 'primary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...sleeveStripes(), ...pantsStripes()],
      number: { fill: '#FFFFFF', outline: STEELERS_GOLD },
    },
    // Away is a white body over the same gold pants and black shell; here the stripe set's black
    // separators do the work they are invisible doing at home.
    away: {
      helmetColor: 'accent',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...sleeveStripes(), ...pantsStripes()],
      number: { fill: 'accent', outline: 'secondary' },
    },
    // The 1934 "Bumblebee" throwback inverts the kit: gold shell and gold body, with the black
    // chevron-and-pinstripe panel carrying the design and khaki pants below it. Its palette stores
    // black as primary and gold as secondary, so the body is pinned to secondary.
    bumblebee: {
      helmetColor: 'secondary',
      jerseyColor: 'secondary',
      pantsColor: STEELERS_BUMBLEBEE_KHAKI,
      removeLayerIds: GENERIC_STRIPPED,
      layers: bumblebeeLayers(),
      number: { fill: 'accent', outline: 'primary' },
    },
  },
};
