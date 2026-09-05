// Dallas authored as composable parts. Geometry is imported unchanged from cowboys.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: both Cowboys kits wear the SAME silver shell with the navy
// star decal (white keyline over navy body) and the SAME white pants. But unlike most teams, the
// two kits are NOT one construction recolored — home has a white/silver neck band and V-collar on
// a navy body; away has navy sleeve caps on a white body. So the shared parts are the helmet and
// pants only; the jerseys are genuinely different constructions that happen to both use navy as
// their accent. The flat form reached the star's navy through `primary` at home and `secondary`
// away and the pants through a white literal (the home palette has no white token); here those
// are one palette entry each.

import {
  COWBOYS_COLLAR_CORE_WIDTH,
  COWBOYS_COLLAR_OUTER_WIDTH,
  COWBOYS_DECAL_STAR_BODY_PATH,
  COWBOYS_DECAL_STAR_OUTER_PATH,
  COWBOYS_HELMET_SILVER,
  COWBOYS_NECK_BAND_CORE,
  COWBOYS_NECK_BAND_OUTER,
  COWBOYS_SLEEVE_CAP_LEFT,
  COWBOYS_SLEEVE_CAP_RIGHT,
} from './cowboys';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';

// The navy star: the full silhouette painted white and the star body over it reproduces the white
// keyline as the gap between them (see cowboys.ts — the outer keyline hairline is dropped). Both
// paths need fill-rule evenodd for the star's counters.
function star(body: string): PartLayer[] {
  return [
    {
      id: 'cowboys-decal-star-keyline',
      surface: 'helmet',
      d: COWBOYS_DECAL_STAR_OUTER_PATH,
      clip: true,
      kind: 'fill',
      fillRule: 'evenodd',
      fill: 'white',
    },
    {
      id: 'cowboys-decal-star-body',
      surface: 'helmet',
      d: COWBOYS_DECAL_STAR_BODY_PATH,
      clip: true,
      kind: 'fill',
      fillRule: 'evenodd',
      fill: body,
    },
  ];
}

// The silver shell with the navy star — one object, shared by both kits. The "Blue Metallic" shell
// comes from the module constant (published helmet color, teamcolorcodes); the GUD composite reads
// it a step lighter (#B7C3CD) under its own shading.
//
// Steel cage. The Cowboys' shell carries a steel/silver facemask (named sources; the GUD composite
// reads the bars at #808080, darker than the shell itself). The shared neutral #4b5158 it replaces
// is a near-black grey and reads differently against the silver shell.
const HELMET_SILVER_STAR: UniformPart = {
  base: 'helmetSilver',
  facemask: 'steelGrey',
  layers: star('navy'),
};

// Home jersey: navy body, white/silver neck band, white-over-silver V-collar, white numerals.
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    {
      id: 'cowboys-neck-band-outer',
      surface: 'jersey',
      d: COWBOYS_NECK_BAND_OUTER,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'cowboys-neck-band-core',
      surface: 'jersey',
      d: COWBOYS_NECK_BAND_CORE,
      clip: true,
      kind: 'fill',
      fill: 'silver',
    },
    {
      id: 'cowboys-collar-outer',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: COWBOYS_COLLAR_OUTER_WIDTH,
    },
    {
      id: 'cowboys-collar-core',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'silver',
      strokeWidth: COWBOYS_COLLAR_CORE_WIDTH,
    },
  ],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey: white body under navy sleeve caps, navy numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [
    {
      id: 'cowboys-sleeve-cap-left',
      surface: 'sleeve-left',
      d: COWBOYS_SLEEVE_CAP_LEFT,
      clip: true,
      kind: 'fill',
      fill: 'navy',
    },
    {
      id: 'cowboys-sleeve-cap-right',
      surface: 'sleeve-right',
      d: COWBOYS_SLEEVE_CAP_RIGHT,
      clip: true,
      kind: 'fill',
      fill: 'navy',
    },
  ],
  number: { fill: 'navy', outline: 'navy', outlineWidth: 10 },
};

// Plain white pants, shared by both kits. Home reaches this through a white literal in the flat
// form; away through its primary.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const COWBOYS_PARTS: TeamPartsDefinition = {
  teamId: 'cowboys',
  // Jersey hexes from the curated rows (teamcolorcodes), plus the published helmet shell and the
  // GUD-sampled cage. The away row reaches navy through its secondary and silver through accent;
  // home reaches silver through secondary — each is one palette entry here.
  palette: {
    navy: '#003594',
    white: '#FFFFFF',
    silver: '#869397',
    // The published helmet "Blue Metallic" — the shell is several steps lighter than the jersey
    // silver (see cowboys.ts).
    helmetSilver: COWBOYS_HELMET_SILVER,
    // Sampled from the GUD composite (nfl-uniform-refs/cowboys): the cage bars read #808080
    // against the shell's #B7C3CD. Steel/silver per named sources.
    steelGrey: '#808080',
  },
  helmets: { 'silver-star': HELMET_SILVER_STAR },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'silver-star', jersey: 'navy', pants: 'white' },
    away: { helmet: 'silver-star', jersey: 'white', pants: 'white' },
  },
};

export const COWBOYS_UNIFORMS_FROM_PARTS = compileParts(COWBOYS_PARTS);
