// Denver authored as composable parts. Geometry is imported unchanged from broncos.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// The four kits resolve to two helmets: the modern NAVY shell wearing the horse (home, away,
// orange-alt share it) and the ORANGE CRUSH royal shell wearing the era's "D" (a different uniform
// entirely: three sleeve bands, no shoulder wedge, no collar). The three modern kits actually
// combine only two jerseys — home and orange-alt are the same orange body with the same
// white-over-navy shoulder wedge and navy collar, differing only in the pants (navy vs white) —
// and two pants: orange (home) and white (away, orange-alt, orange-crush).
//
// The palette-note in broncos.ts holds here: the stored home palette is stale (home renders an
// orange body, not the reference's navy jersey). This migration preserves the existing render.

import {
  BRONCOS_COLLAR_LEFT,
  BRONCOS_COLLAR_RIGHT,
  BRONCOS_COLLAR_WIDTH,
  BRONCOS_CRUSH_BAND_LOW_LEFT,
  BRONCOS_CRUSH_BAND_LOW_RIGHT,
  BRONCOS_CRUSH_BAND_MID_LEFT,
  BRONCOS_CRUSH_BAND_MID_RIGHT,
  BRONCOS_CRUSH_BAND_TOP_LEFT,
  BRONCOS_CRUSH_BAND_TOP_RIGHT,
  BRONCOS_CRUSH_DECAL_D_PATH,
  BRONCOS_CRUSH_DECAL_KEYLINE_PATH,
  BRONCOS_DECAL_HORSE_PATH,
  BRONCOS_DECAL_MANE_PATH,
  BRONCOS_WEDGE_LOWER_LEFT,
  BRONCOS_WEDGE_LOWER_RIGHT,
  BRONCOS_WEDGE_UPPER_LEFT,
  BRONCOS_WEDGE_UPPER_RIGHT,
} from './broncos';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The shoulder wedge: white band over navy. Order inverts on the navy away body (orange over
// navy), which is why both colors are parameters. Home and orange-alt share the white-over-navy
// construction.
function shoulderWedge(upper: string, lower: string): PartLayer[] {
  return [
    fill('broncos-wedge-upper-left', 'sleeve-left', BRONCOS_WEDGE_UPPER_LEFT, upper),
    fill('broncos-wedge-upper-right', 'sleeve-right', BRONCOS_WEDGE_UPPER_RIGHT, upper),
    fill('broncos-wedge-lower-left', 'sleeve-left', BRONCOS_WEDGE_LOWER_LEFT, lower),
    fill('broncos-wedge-lower-right', 'sleeve-right', BRONCOS_WEDGE_LOWER_RIGHT, lower),
  ];
}

// The short collar arc down each side of the neck (two arcs, not a chevron — they never meet).
function collar(stroke: string): PartLayer[] {
  return [
    {
      id: 'broncos-collar-left',
      surface: 'collar',
      d: BRONCOS_COLLAR_LEFT,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: BRONCOS_COLLAR_WIDTH,
    },
    {
      id: 'broncos-collar-right',
      surface: 'collar',
      d: BRONCOS_COLLAR_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: BRONCOS_COLLAR_WIDTH,
    },
  ];
}

// The horse decal: orange mane under a white head. The eye and nostril are shell-colored so they
// read through. Fixed-art colors on the navy shell.
function horseDecal(): PartLayer[] {
  return [
    fill('broncos-decal-under', 'helmet', BRONCOS_DECAL_MANE_PATH, 'orange'),
    fill('broncos-decal-over', 'helmet', BRONCOS_DECAL_HORSE_PATH, 'white'),
  ];
}

// Orange Crush's "D": white keyline under the orange letter/charged horse.
function crushDecal(): PartLayer[] {
  return [
    fill('broncos-decal-under', 'helmet', BRONCOS_CRUSH_DECAL_KEYLINE_PATH, 'white'),
    fill('broncos-decal-over', 'helmet', BRONCOS_CRUSH_DECAL_D_PATH, 'crushOrange'),
  ];
}

// The modern navy shell with the horse decal — one object, shared by home, away and orange-alt.
//
// White cage. The modern navy shell wears a white facemask (named sources; also the classic
// navy-helmet era). The white cage reads cleanly against the navy shell.
const HELMET_NAVY_HORSE: UniformPart = {
  base: 'navy',
  facemask: 'white',
  layers: horseDecal(),
};

// Orange Crush's royal shell with the "D" decal.
//
// White cage. Orange Crush's royal shell also wears a white/light cage (the D-era look; the era's
// shell was royal with a light cage, and the modern navy shell's white mask is the same Riddell
// SF2BD-SW-SP we set across the league's white-cage teams). The white reads cleanly against royal.
const HELMET_ROYAL_D: UniformPart = {
  base: 'royal',
  facemask: 'white',
  layers: crushDecal(),
};

// Home + orange-alt jersey: orange body, white-over-navy shoulder wedge, navy collar, orange
// decal colors on the shell. The numeral face here is white (home keylines it navy — see below),
// so the two kits share the jersey and differ only in pants.
const JERSEY_ORANGE: UniformPart = {
  base: 'orange',
  layers: [...shoulderWedge('white', 'navy'), ...collar('navy')],
  number: { fill: 'white', outline: 'navy', outlineWidth: 14 },
};

// Away jersey: white body, orange-over-navy shoulder wedge (order inverts with the body), navy
// collar, navy numerals keylined orange.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...shoulderWedge('orange', 'navy'), ...collar('orange')],
  number: { fill: 'navy', outline: 'orange', outlineWidth: 14 },
};

// Orange Crush jersey: orange body, three sleeve bands (royal, white, royal), no wedge or collar,
// white numerals keylined royal.
const JERSEY_CRUSH: UniformPart = {
  base: 'crushOrange',
  layers: [
    fill('broncos-crush-band-top-left', 'sleeve-left', BRONCOS_CRUSH_BAND_TOP_LEFT, 'royal'),
    fill('broncos-crush-band-top-right', 'sleeve-right', BRONCOS_CRUSH_BAND_TOP_RIGHT, 'royal'),
    fill('broncos-crush-band-mid-left', 'sleeve-left', BRONCOS_CRUSH_BAND_MID_LEFT, 'white'),
    fill('broncos-crush-band-mid-right', 'sleeve-right', BRONCOS_CRUSH_BAND_MID_RIGHT, 'white'),
    fill('broncos-crush-band-low-left', 'sleeve-left', BRONCOS_CRUSH_BAND_LOW_LEFT, 'royal'),
    fill('broncos-crush-band-low-right', 'sleeve-right', BRONCOS_CRUSH_BAND_LOW_RIGHT, 'royal'),
  ],
  number: { fill: 'white', outline: 'royal', outlineWidth: 14 },
};

// Navy pants (home).
// Home pants, orange (the flat home inherits primary = orange).
const PANTS_ORANGE: UniformPart = { base: 'orange', layers: [] };

// White pants (away, orange-alt, orange-crush).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const BRONCOS_PARTS: TeamPartsDefinition = {
  teamId: 'broncos',
  // Jersey hexes from the curated rows (teamcolorcodes). Navy/orange/white are the physical modern
  // body colors carried in different slots per row; royal and crush-orange are Orange Crush's era
  // colors (its primary/secondary).
  palette: {
    navy: '#002244',
    orange: '#FB4F14',
    white: '#FFFFFF',
    royal: '#001489',
    crushOrange: '#FA4616',
  },
  helmets: { 'navy-horse': HELMET_NAVY_HORSE, 'royal-d': HELMET_ROYAL_D },
  jerseys: {
    orange: JERSEY_ORANGE,
    white: JERSEY_WHITE,
    crush: JERSEY_CRUSH,
  },
  pants: { orange: PANTS_ORANGE, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'navy-horse', jersey: 'orange', pants: 'orange' },
    away: { helmet: 'navy-horse', jersey: 'white', pants: 'white' },
    'orange-alt': { helmet: 'navy-horse', jersey: 'orange', pants: 'white' },
    'orange-crush': { helmet: 'royal-d', jersey: 'crush', pants: 'white' },
  },
};

export const BRONCOS_UNIFORMS_FROM_PARTS = compileParts(BRONCOS_PARTS);
