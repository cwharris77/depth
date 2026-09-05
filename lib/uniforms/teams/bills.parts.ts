// Buffalo authored as composable parts. Geometry is imported unchanged from bills.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// The two "modern" kits (home, away) share the SAME white shell with the buffalo decal, red
// diagonal stripe, navy/red back-edge piping, and the red/white/navy sleeve+collar band set. The
// Rivalries kit is the genuinely different one: an ice-silver tone-on-tone helmet treatment with
// no standard banding. Body and pants are blue at home, white at away, and the rivalries body is
// white with its own number treatment.

import {
  BILLS_COLLAR_WIDTHS,
  BILLS_HELMET_DECAL_BUFFALO_PATH,
  BILLS_HELMET_DECAL_STRIPE_PATH,
  BILLS_HELMET_EDGE_STRIPE_INNER_PATH,
  BILLS_HELMET_EDGE_STRIPE_INNER_WIDTH,
  BILLS_HELMET_EDGE_STRIPE_OUTER_PATH,
  BILLS_HELMET_EDGE_STRIPE_OUTER_WIDTH,
  BILLS_SLEEVE_NAVY_LEFT,
  BILLS_SLEEVE_NAVY_RIGHT,
  BILLS_SLEEVE_RED_LEFT,
  BILLS_SLEEVE_RED_RIGHT,
  BILLS_SLEEVE_WHITE_LEFT,
  BILLS_SLEEVE_WHITE_RIGHT,
} from './bills';
import { compileParts, type TeamPartsDefinition, type UniformPart } from './parts';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';
const SLEEVE_BAND_PATH_LEFT = 'M34,558 L156,558 L152,578 L34,578 Z';
const SLEEVE_BAND_PATH_RIGHT = 'M554,558 L432,558 L436,578 L554,578 Z';
const PANTS_STRIPE_PATH_LEFT = 'M118,807 H134 V1462 H118 Z';
const PANTS_STRIPE_PATH_RIGHT = 'M454,807 H470 V1462 H454 Z';

// The white shell with the navy buffalo, red diagonal stripe, navy/red back-edge piping, and the
// red/white/navy sleeve+collar band set — one object, shared by home and away. The generic red
// sleeve hem band and the collar band set sit FIRST on their surfaces (before the bills band set),
// matching the flat definition's inherited-then-applied paint order; order is load-bearing here
// only for the parity harness, the bands do not overlap.
//

// cage can't be cleanly read from the GUD composite, so the named source is the source of truth).
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: [
    {
      id: 'bills-helmet-buffalo',
      surface: 'helmet',
      d: BILLS_HELMET_DECAL_BUFFALO_PATH,
      clip: true,
      kind: 'fill',
      fill: 'navy',
    },
    {
      id: 'bills-helmet-stripe',
      surface: 'helmet',
      d: BILLS_HELMET_DECAL_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'bills-helmet-edge-outer',
      surface: 'helmet',
      d: BILLS_HELMET_EDGE_STRIPE_OUTER_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'navy',
      strokeWidth: BILLS_HELMET_EDGE_STRIPE_OUTER_WIDTH,
      lineCap: 'round',
    },
    {
      id: 'bills-helmet-edge-inner',
      surface: 'helmet',
      d: BILLS_HELMET_EDGE_STRIPE_INNER_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'red',
      strokeWidth: BILLS_HELMET_EDGE_STRIPE_INNER_WIDTH,
      lineCap: 'round',
    },
    {
      id: 'generic-sleeve-stripe-left',
      surface: 'sleeve-left',
      d: SLEEVE_BAND_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'generic-sleeve-stripe-right',
      surface: 'sleeve-right',
      d: SLEEVE_BAND_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'bills-sleeve-red-left',
      surface: 'sleeve-left',
      d: BILLS_SLEEVE_RED_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'bills-sleeve-red-right',
      surface: 'sleeve-right',
      d: BILLS_SLEEVE_RED_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'bills-sleeve-white-left',
      surface: 'sleeve-left',
      d: BILLS_SLEEVE_WHITE_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'bills-sleeve-white-right',
      surface: 'sleeve-right',
      d: BILLS_SLEEVE_WHITE_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'bills-sleeve-navy-left',
      surface: 'sleeve-left',
      d: BILLS_SLEEVE_NAVY_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'navy',
    },
    {
      id: 'bills-sleeve-navy-right',
      surface: 'sleeve-right',
      d: BILLS_SLEEVE_NAVY_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'navy',
    },
    {
      id: 'bills-collar-white',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: BILLS_COLLAR_WIDTHS.white,
    },
    {
      id: 'bills-collar-red',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'red',
      strokeWidth: BILLS_COLLAR_WIDTHS.red,
    },
    {
      id: 'bills-collar-navy',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'navy',
      strokeWidth: BILLS_COLLAR_WIDTHS.navy,
    },
  ],
};

// Rivalries' ice-silver helmet: the shell stays the shared white (the flat inherits the default
// white shell; only the decal/stripe treatment is silver). Silver buffalo + navy outline, silver
// stripe + navy outline, navy collar. No red, no standard band set. Same white cage as the modern
// shell (both use the SF2BD-SW-SP white mask).
const HELMET_ICE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: [
    {
      id: 'bills-helmet-buffalo',
      surface: 'helmet',
      d: BILLS_HELMET_DECAL_BUFFALO_PATH,
      clip: true,
      kind: 'fill',
      fill: 'iceSilver',
    },
    {
      id: 'bills-helmet-buffalo-outline',
      surface: 'helmet',
      d: BILLS_HELMET_DECAL_BUFFALO_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'navy',
      strokeWidth: 3,
      lineCap: 'round',
    },
    {
      id: 'bills-helmet-stripe',
      surface: 'helmet',
      d: BILLS_HELMET_DECAL_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'iceSilverLight',
    },
    {
      id: 'bills-helmet-stripe-outline',
      surface: 'helmet',
      d: BILLS_HELMET_DECAL_STRIPE_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'navy',
      strokeWidth: 3,
      lineCap: 'round',
    },
    {
      id: 'generic-collar',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'navy',
      strokeWidth: 13,
    },
  ],
};

// Home jersey: blue body, red generic sleeve band (the flat home inherits it), blue is the body.
const JERSEY_BLUE: UniformPart = {
  base: 'navy',
  layers: [
    {
      id: 'generic-sleeve-stripe-left',
      surface: 'sleeve-left',
      d: SLEEVE_BAND_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'generic-sleeve-stripe-right',
      surface: 'sleeve-right',
      d: SLEEVE_BAND_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
  ],
  number: { fill: 'readable-on-body', outline: 'red', outlineWidth: 26 },
};

// Away jersey: white body with the red sleeve band and red pant stripe (the generic layers painted
// red, since the white body needs the contrast).
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [
    {
      id: 'generic-sleeve-stripe-left',
      surface: 'sleeve-left',
      d: SLEEVE_BAND_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'generic-sleeve-stripe-right',
      surface: 'sleeve-right',
      d: SLEEVE_BAND_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'generic-pants-stripe-left',
      surface: 'leg-left',
      d: PANTS_STRIPE_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'generic-pants-stripe-right',
      surface: 'leg-right',
      d: PANTS_STRIPE_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
  ],
  number: { fill: 'navy', outline: 'red', outlineWidth: 26 },
};

// Rivalries jersey: white body, no banding, silver-bordered navy numerals on the ice treatment.
const JERSEY_RIVALRIES: UniformPart = {
  base: 'white',
  layers: [],
  number: { fill: 'rivalriesNumber', outline: 'navy', outlineWidth: 26 },
};

// Home pants, blue, with the red generic pant stripe (the flat home inherits it).
const PANTS_BLUE: UniformPart = {
  base: 'navy',
  layers: [
    {
      id: 'generic-pants-stripe-left',
      surface: 'leg-left',
      d: PANTS_STRIPE_PATH_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
    {
      id: 'generic-pants-stripe-right',
      surface: 'leg-right',
      d: PANTS_STRIPE_PATH_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'red',
    },
  ],
};

// Away pants, white with the red stripe (painted via JERSEY_WHITE's legs).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Rivalries pants, white, unbanded.
const PANTS_RIVALRIES: UniformPart = { base: 'white', layers: [] };

export const BILLS_PARTS: TeamPartsDefinition = {
  teamId: 'bills',
  // Construction hexes from the module (teamcolorcodes for navy/red; the ice-silver shades and the
  // rivalries number silver are fixed reference-bound approximations, see bills.ts).
  palette: {
    navy: '#00338D',
    red: '#C60C30',
    white: '#ffffff',
    iceSilver: '#9CA0A4',
    iceSilverLight: '#D6D8DA',
    rivalriesNumber: '#A9ADB1',
  },
  helmets: { white: HELMET_WHITE, ice: HELMET_ICE },
  jerseys: {
    blue: JERSEY_BLUE,
    white: JERSEY_WHITE,
    rivalries: JERSEY_RIVALRIES,
  },
  pants: { blue: PANTS_BLUE, white: PANTS_WHITE, rivalries: PANTS_RIVALRIES },
  kits: {
    home: { helmet: 'white', jersey: 'blue', pants: 'blue' },
    away: { helmet: 'white', jersey: 'white', pants: 'white' },
    'rivalries-2025': { helmet: 'ice', jersey: 'rivalries', pants: 'rivalries' },
  },
};

export const BILLS_UNIFORMS_FROM_PARTS = compileParts(BILLS_PARTS);
