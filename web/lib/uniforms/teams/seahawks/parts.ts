// Seattle authored as composable parts (spike). Geometry is imported unchanged from
// seahawks.ts; this file restates which parts each kit combines and names every color from the
// team palette.
//
// Seattle is the harder migration and the one that proves the model. Three things the flat
// definition could not say:
//
//   1. Home and away paint the SAME helmet — navy shell, slate crown wedge, white hawk, green
//      eye — but reach it through inverted tokens (home's 'secondary' and away's 'accent' are
//      both action green). The flat form has to spell both out and hope they stay in sync;
//      here there is one helmet part and the question cannot arise.
//   2. Each kit stripped a DIFFERENT subset of generic mannequin layers, so what a kit
//      inherited was implicit. Parts are total: every generic layer is stripped, and a part
//      that wants a generic mark keeps it explicitly via fromGeneric() with a palette color.
//   3. The 1976 kit's collar relies on a same-id replacement landing at the INHERITED layer's
//      index rather than where it appears in the source array. That ordering is reproduced
//      literally below, because the spike's contract is byte-identical output, not a fix.

import {
  SEAHAWKS_1976_HELMET_GREEN_BAND,
  SEAHAWKS_1976_HELMET_ROYAL_BAND,
  SEAHAWKS_1976_PANTS_GREEN_LEFT,
  SEAHAWKS_1976_PANTS_GREEN_RIGHT,
  SEAHAWKS_1976_PANTS_WHITE_LEFT,
  SEAHAWKS_1976_PANTS_WHITE_RIGHT,
  SEAHAWKS_1976_SLEEVE_GREEN_LEFT,
  SEAHAWKS_1976_SLEEVE_GREEN_RIGHT,
  SEAHAWKS_1976_SLEEVE_WHITE_LEFT,
  SEAHAWKS_1976_SLEEVE_WHITE_RIGHT,
  SEAHAWKS_HELMET_HAWK_EYE_PATH,
  SEAHAWKS_HELMET_HAWK_GREY_PATH,
  SEAHAWKS_HELMET_HAWK_PATH,
  SEAHAWKS_SHOULDER_BAND_LEFT,
  SEAHAWKS_SHOULDER_BAND_RIGHT,
  SEAHAWKS_SHOULDER_BAR_LEFT,
  SEAHAWKS_SHOULDER_BAR_RIGHT,
  SEAHAWKS_SHOULDER_CAP_LEFT,
  SEAHAWKS_SHOULDER_CAP_RIGHT,
} from './source';
import { HELMET_CROWN_STRIPE_PATH } from '../core/shared';
import { fromGeneric, type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

import {
  SEAHAWKS_RIVALRIES_JERSEY,
  SEAHAWKS_RIVALRIES_JERSEY_PALETTE,
} from './jerseys/rivalries-2025';

export const COLLAR_PATH = 'M206,388 L294,455 L386,388';

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

// Bar, band and cap, mirrored. One construction; home and away differ only in the band color.
export function shoulder(band: string, cap: string): PartLayer[] {
  return [
    fill('seahawks-shoulder-bar-left', 'sleeve-left', SEAHAWKS_SHOULDER_BAR_LEFT, band),
    fill('seahawks-shoulder-bar-right', 'sleeve-right', SEAHAWKS_SHOULDER_BAR_RIGHT, band),
    fill('seahawks-shoulder-band-left', 'sleeve-left', SEAHAWKS_SHOULDER_BAND_LEFT, band),
    fill('seahawks-shoulder-band-right', 'sleeve-right', SEAHAWKS_SHOULDER_BAND_RIGHT, band),
    fill('seahawks-shoulder-cap-left', 'sleeve-left', SEAHAWKS_SHOULDER_CAP_LEFT, cap),
    fill('seahawks-shoulder-cap-right', 'sleeve-right', SEAHAWKS_SHOULDER_CAP_RIGHT, cap),
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

const HELMET_1976_SILVER: UniformPart = {
  base: 'silver76',
  layers: [
    fill('seahawks-1976-helmet-royal', 'helmet', SEAHAWKS_1976_HELMET_ROYAL_BAND, 'royal76'),
    fill('seahawks-1976-helmet-green', 'helmet', SEAHAWKS_1976_HELMET_GREEN_BAND, 'green76'),
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
  crownWedge: '#2B507C',
  // A fourth color with no kit token, and it can never have one: it fails AA on the dark UI
  // (1.57), so it could never be uiAccent. Sampled from the GUD 2025 composite.
  rivalriesTeal: '#023A4D',
  rivalriesSilver: '#C6D3DC',
  rivalriesPine: '#29594C',
  royal76: '#003087',
  green76: '#046A38',
  silver76: '#8A8D8F',
  // Sampled from the GUD reference helmet crop.
  facemaskBlack: '#000000',
};
export const SEAHAWKS_HELMETS = {
  'navy-hawk': HELMET_NAVY_HAWK,
  'teal-hawk': HELMET_TEAL_HAWK,
  'silver-1976': HELMET_1976_SILVER,
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
  'silver-1976': {
    base: 'silver76',
    layers: [
      fill('seahawks-1976-pants-white-left', 'leg-left', SEAHAWKS_1976_PANTS_WHITE_LEFT, 'white'),
      fill(
        'seahawks-1976-pants-white-right',
        'leg-right',
        SEAHAWKS_1976_PANTS_WHITE_RIGHT,
        'white'
      ),
      fill('seahawks-1976-pants-green-left', 'leg-left', SEAHAWKS_1976_PANTS_GREEN_LEFT, 'green76'),
      fill(
        'seahawks-1976-pants-green-right',
        'leg-right',
        SEAHAWKS_1976_PANTS_GREEN_RIGHT,
        'green76'
      ),
    ],
  },
  'rivalries-silver': {
    base: 'rivalriesSilver',
    layers: [
      fromGeneric('generic-pants-stripe-left', 'navy'),
      fromGeneric('generic-pants-stripe-right', 'navy'),
    ],
  },
};
export const SEAHAWKS_KITS = {
  home: { helmet: 'navy-hawk', jersey: 'navy', pants: 'navy' },
  away: { helmet: 'navy-hawk', jersey: 'white', pants: 'white-plain' },
  '1976-throwback': { helmet: 'silver-1976', jersey: 'royal-1976', pants: 'silver-1976' },
  'rivalries-2025': {
    helmet: 'teal-hawk',
    jersey: 'rivalries-silver',
    pants: 'rivalries-silver',
  },
};
