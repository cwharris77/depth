// Seattle authored as composable parts (spike). Geometry is imported unchanged from
// seahawks.ts; this file restates which parts each kit combines and names every color from the
// team palette.
//
// Seattle is the harder migration and the one that proves the model. Two things the flat
// definition could not say:
//
//   1. Home and away paint the SAME helmet — navy shell, slate crown wedge, white hawk, green
//      eye — but reach it through inverted tokens (home's 'secondary' and away's 'accent' are
//      both action green). The flat form has to spell both out and hope they stay in sync;
//      here there is one helmet part and the question cannot arise.
//   2. Each kit stripped a DIFFERENT subset of generic mannequin layers, so what a kit
//      inherited was implicit. Parts are total: every generic layer is stripped, and a part
//      that wants a generic mark keeps it explicitly via fromGeneric() with a palette color.

import {
  SEAHAWKS_SHOULDER_WORDMARK,
  SEAHAWKS_NECK_OPENING,
  SEAHAWKS_COLLAR_BAND,
  SEAHAWKS_COLLAR_FEATHERS_LEFT,
  SEAHAWKS_COLLAR_FEATHERS_RIGHT,
  SEAHAWKS_NECK_TWELVE,
  SEAHAWKS_THROWBACK_HAWK_BLOCK_PATH,
  SEAHAWKS_THROWBACK_HAWK_EYE_PATH,
  SEAHAWKS_THROWBACK_HAWK_ROYAL_PATH,
  SEAHAWKS_THROWBACK_HAWK_WHITE_PATH,
  SEAHAWKS_THROWBACK_PANTS_GREEN_LEFT,
  SEAHAWKS_THROWBACK_PANTS_GREEN_RIGHT,
  SEAHAWKS_THROWBACK_PANTS_KEYLINE_LEFT,
  SEAHAWKS_THROWBACK_PANTS_KEYLINE_RIGHT,
  SEAHAWKS_THROWBACK_PANTS_ROYAL_LEFT,
  SEAHAWKS_THROWBACK_PANTS_ROYAL_RIGHT,
  SEAHAWKS_THROWBACK_PANTS_WHITE_LEFT,
  SEAHAWKS_THROWBACK_PANTS_WHITE_RIGHT,
  SEAHAWKS_THROWBACK_SOCK_LEFT,
  SEAHAWKS_THROWBACK_SOCK_RIGHT,
  SEAHAWKS_HELMET_HAWK_EYE_PATH,
  SEAHAWKS_HELMET_HAWK_GREY_PATH,
  SEAHAWKS_HELMET_HAWK_PATH,
  SEAHAWKS_SHOULDER_BAND_LEFT,
  SEAHAWKS_SHOULDER_BAND_RIGHT,
  SEAHAWKS_SHOULDER_NUMBER_LEFT,
  SEAHAWKS_SHOULDER_NUMBER_RIGHT,
  SEAHAWKS_SHOULDER_CAP_LEFT,
  SEAHAWKS_SHOULDER_CAP_RIGHT,
} from './source';
import { HELMET_CROWN_STRIPE_PATH } from '../core/shared';
import { fromGeneric, type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

import { SEAHAWKS_RIVALRIES_JERSEY_PALETTE } from './jerseys/rivalries-2025';

export const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The modern decal: the wolf-grey wing, then a white keyline whose counters let the shell read
// through, then the eye. There is no navy backing shape, which is why the mark only works on a
// shell it contrasts with. Geometry and placement rationale live in seahawks.ts.
function hawk(eye: string): PartLayer[] {
  return [
    fill('seahawks-helmet-hawk-grey', 'helmet', SEAHAWKS_HELMET_HAWK_GREY_PATH, 'wolfGrey'),
    fill('seahawks-helmet-hawk', 'helmet', SEAHAWKS_HELMET_HAWK_PATH, 'white'),
    fill('seahawks-helmet-hawk-eye', 'helmet', SEAHAWKS_HELMET_HAWK_EYE_PATH, eye),
  ];
}

// Shoulder numerals, band and cap share their placement across home and away.
export function shoulder(band: string, cap: string): PartLayer[] {
  return [
    fill('seahawks-shoulder-number-left', 'sleeve-left', SEAHAWKS_SHOULDER_NUMBER_LEFT, band),
    fill('seahawks-shoulder-number-right', 'sleeve-right', SEAHAWKS_SHOULDER_NUMBER_RIGHT, band),
    fill('seahawks-shoulder-band-left', 'sleeve-left', SEAHAWKS_SHOULDER_BAND_LEFT, band),
    fill('seahawks-shoulder-band-right', 'sleeve-right', SEAHAWKS_SHOULDER_BAND_RIGHT, band),
    fill('seahawks-shoulder-cap-left', 'sleeve-left', SEAHAWKS_SHOULDER_CAP_LEFT, cap),
    fill('seahawks-shoulder-cap-right', 'sleeve-right', SEAHAWKS_SHOULDER_CAP_RIGHT, cap),
  ];
}

// The body-color collar frames a shaded opening and back-neck tab; its chevrons stop
// before the V point. Home and away share geometry with different feather and wordmark colors.
export function modernNeckAndWordmark(
  body: string,
  neck: string,
  feathers: string,
  wordmark: string
): PartLayer[] {
  return [
    fill('seahawks-neck-opening', 'collar', SEAHAWKS_NECK_OPENING, neck),
    fill('seahawks-collar-band', 'collar', SEAHAWKS_COLLAR_BAND, body),
    fill('seahawks-collar-feathers-left', 'collar', SEAHAWKS_COLLAR_FEATHERS_LEFT, feathers),
    fill('seahawks-collar-feathers-right', 'collar', SEAHAWKS_COLLAR_FEATHERS_RIGHT, feathers),
    fill('seahawks-neck-tab-border', 'collar', 'M279,389 H309 V417 H279 Z', 'green'),
    fill('seahawks-neck-tab', 'collar', 'M281,391 H307 V415 H281 Z', 'navy'),
    fill('seahawks-neck-twelve', 'collar', SEAHAWKS_NECK_TWELVE, 'wolfGrey'),
    fill('seahawks-shoulder-wordmark', 'jersey', SEAHAWKS_SHOULDER_WORDMARK, wordmark),
  ];
}

const HELMET_NAVY_HAWK: UniformPart = {
  base: 'navy',
  // Black cage, sampled from the GUD reference crop (the facemask region reads #000000 there,
  // against the shell's #0D2135). The shared neutral #4b5158 it replaces was a mid-grey mass at
  // relative luminance 80 over a shell at 29 -- the single brightest thing on the helmet.
  facemask: 'facemaskBlack',
  layers: [
    fill('seahawks-helmet-center-stripe', 'helmet', HELMET_CROWN_STRIPE_PATH, 'crownWedge'),
    ...hawk('green'),
  ],
};

const HELMET_TEAL_HAWK: UniformPart = { base: 'rivalriesTeal', layers: hawk('rivalriesPine') };

// Silver shell with no stripe, a royal cage and the original hawk.
const HELMET_THROWBACK_SILVER: UniformPart = {
  base: 'throwbackSilver',
  facemask: 'throwbackRoyal',
  layers: [
    fill(
      'seahawks-throwback-hawk-royal',
      'helmet',
      SEAHAWKS_THROWBACK_HAWK_ROYAL_PATH,
      'throwbackRoyal'
    ),
    fill('seahawks-throwback-hawk-white', 'helmet', SEAHAWKS_THROWBACK_HAWK_WHITE_PATH, 'white'),
    fill(
      'seahawks-throwback-hawk-block',
      'helmet',
      SEAHAWKS_THROWBACK_HAWK_BLOCK_PATH,
      'throwbackGreen'
    ),
    fill(
      'seahawks-throwback-hawk-eye',
      'helmet',
      SEAHAWKS_THROWBACK_HAWK_EYE_PATH,
      'throwbackGreen'
    ),
  ],
};

export const SEAHAWKS_PALETTE = {
  ...SEAHAWKS_RIVALRIES_JERSEY_PALETTE,
  navy: '#002244',
  green: '#69BE28',
  // Wolf Grey is a construction fact of the modern kit, not a runtime body color: an
  // ESPN-sourced palette sets accent = secondary, so 'accent' would resolve to action green.
  // Hex from teamcolorcodes.
  wolfGrey: '#A5ACAF',
  white: '#FFFFFF',
  // Shaded insides of the neck opening, one step darker than each body so the opening reads.
  navyNeck: '#001A33',
  whiteNeck: '#ECEEEF',
  crownWedge: '#2B507C',
  // A fourth color with no kit token, and it can never have one: it fails AA on the dark UI
  // (1.57), so it could never be uiAccent. Sampled from the GUD 2025 composite.
  rivalriesTeal: '#023A4D',
  rivalriesPine: '#29594C',
  // The throwback's royal, green and two silvers have no published codes; each is the flat fill
  // of the GUD 2025 composite's throwback figure.
  throwbackRoyal: '#0248B3',
  // The inside of the neck opening: the royal in shadow.
  throwbackNeck: '#01358A',
  throwbackGreen: '#0E8329',
  throwbackSilver: '#A7B0BA',
  throwbackPantsSilver: '#DBDDDF',
  // Sampled from the GUD reference helmet crop.
  facemaskBlack: '#000000',
};
export const SEAHAWKS_HELMETS = {
  'navy-hawk': HELMET_NAVY_HAWK,
  'teal-hawk': HELMET_TEAL_HAWK,
  'throwback-silver': HELMET_THROWBACK_SILVER,
};
export const SEAHAWKS_PANTS = {
  // Home keeps the generic stripe pair in green.
  navy: {
    base: 'navy',
    layers: [
      fromGeneric('generic-pants-stripe-left', 'green'),
      fromGeneric('generic-pants-stripe-right', 'green'),
    ],
  },
  // The away reference's white pants carry no stripe at all.
  'white-plain': { base: 'white', layers: [] },
  throwback: {
    base: 'throwbackPantsSilver',
    layers: [
      fill(
        'seahawks-throwback-pants-white-left',
        'leg-left',
        SEAHAWKS_THROWBACK_PANTS_WHITE_LEFT,
        'white'
      ),
      fill(
        'seahawks-throwback-pants-white-right',
        'leg-right',
        SEAHAWKS_THROWBACK_PANTS_WHITE_RIGHT,
        'white'
      ),
      fill(
        'seahawks-throwback-pants-green-left',
        'leg-left',
        SEAHAWKS_THROWBACK_PANTS_GREEN_LEFT,
        'throwbackGreen'
      ),
      fill(
        'seahawks-throwback-pants-green-right',
        'leg-right',
        SEAHAWKS_THROWBACK_PANTS_GREEN_RIGHT,
        'throwbackGreen'
      ),
      fill(
        'seahawks-throwback-pants-keyline-left',
        'leg-left',
        SEAHAWKS_THROWBACK_PANTS_KEYLINE_LEFT,
        'white'
      ),
      fill(
        'seahawks-throwback-pants-keyline-right',
        'leg-right',
        SEAHAWKS_THROWBACK_PANTS_KEYLINE_RIGHT,
        'white'
      ),
      fill(
        'seahawks-throwback-pants-royal-left',
        'leg-left',
        SEAHAWKS_THROWBACK_PANTS_ROYAL_LEFT,
        'throwbackRoyal'
      ),
      fill(
        'seahawks-throwback-pants-royal-right',
        'leg-right',
        SEAHAWKS_THROWBACK_PANTS_ROYAL_RIGHT,
        'throwbackRoyal'
      ),
      fill(
        'seahawks-throwback-sock-left',
        'leg-left',
        SEAHAWKS_THROWBACK_SOCK_LEFT,
        'throwbackRoyal'
      ),
      fill(
        'seahawks-throwback-sock-right',
        'leg-right',
        SEAHAWKS_THROWBACK_SOCK_RIGHT,
        'throwbackRoyal'
      ),
    ],
  },
  'rivalries-silver': {
    base: 'rivalriesJerseyGrey',
    layers: [
      fromGeneric('generic-pants-stripe-left', 'navy'),
      fromGeneric('generic-pants-stripe-right', 'navy'),
    ],
  },
};
export const SEAHAWKS_KITS = {
  home: { helmet: 'navy-hawk', jersey: 'navy', pants: 'navy' },
  away: { helmet: 'navy-hawk', jersey: 'white', pants: 'white-plain' },
  '1976-throwback': { helmet: 'throwback-silver', jersey: 'throwback', pants: 'throwback' },
  'rivalries-2025': {
    helmet: 'teal-hawk',
    jersey: 'rivalries-silver',
    pants: 'rivalries-silver',
  },
};
