// Buffalo authored as composable parts: the palette, the two helmets and the three pants options.
// Each kit's jersey is a JerseySpec in ./jerseys.
//
// The two modern kits (home, away) share the same white shell with the navy buffalo and red
// diagonal stripe. The Rivalries kit is the genuinely different one: an ice-silver tone-on-tone
// helmet treatment. Body and pants are royal at home, white at away; the Rivalries body is white.

import { BILLS_HELMET_DECAL_BUFFALO_PATH, BILLS_HELMET_DECAL_STRIPE_PATH } from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import type { UniformPart } from '../core/parts';

const PANTS_STRIPE_PATH_LEFT = 'M118,807 H134 V1462 H118 Z';
const PANTS_STRIPE_PATH_RIGHT = 'M454,807 H470 V1462 H454 Z';

// The white shell with the navy buffalo and red diagonal stripe, shared by home and away.
const HELMET_WHITE: UniformPart = expandHelmet('bills-white-helmet', {
  shell: 'white',
  facemask: 'white',
  decal: placed([
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
  ]),
  number: 'none',
});

// Rivalries' ice-silver helmet: the shell stays white and only the decal/stripe treatment is
// silver, each outlined in navy. No red. Same white cage as the modern shell.
const HELMET_ICE: UniformPart = expandHelmet('bills-ice-helmet', {
  shell: 'white',
  facemask: 'white',
  decal: placed([
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
  ]),
  number: 'none',
});

// Home pants, royal, with the red side stripe.
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

// White pants are the canonical away option and the alternate home option; their red stripe is
// part of the pants so this option remains correct when paired with either standard jersey.
const PANTS_WHITE: UniformPart = {
  base: 'white',
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

// Rivalries pants, white, unbanded.
const PANTS_RIVALRIES: UniformPart = { base: 'white', layers: [] };

export const BILLS_CONSTRUCTION = {
  teamId: 'bills',
  // Navy and red are the official brand hexes; the ice-silver shades and the Rivalries numeral
  // silver are fixed approximations for a treatment the brand palette has no token for.
  palette: {
    navy: '#00338D',
    red: '#C60C30',
    white: '#ffffff',
    iceSilver: '#9CA0A4',
    iceSilverLight: '#D6D8DA',
    rivalriesNumber: '#A9ADB1',
  },
  helmets: { white: HELMET_WHITE, ice: HELMET_ICE },
  pants: { blue: PANTS_BLUE, white: PANTS_WHITE, rivalries: PANTS_RIVALRIES },
  kits: {
    // The 2025 composite shows both blue and white trousers with each modern top;
    // canonical-first preserves the existing blue-over-blue and white-over-white rasters.
    home: { helmet: 'white', jersey: 'blue', pants: ['blue', 'white'] },
    away: { helmet: 'white', jersey: 'white', pants: ['white', 'blue'] },
    'rivalries-2025': { helmet: 'ice', jersey: 'rivalries', pants: 'rivalries' },
  },
};
