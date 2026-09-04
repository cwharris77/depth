// Indianapolis authored as composable parts. Geometry is imported unchanged from colts.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: both Colts kits wear the SAME white shell with the navy
// horseshoe decal, and the SAME white pants. The flat form put the shell and pants in `defaults`
// and reached the same painted result through inverse tokens on home (horseshoe = primary) vs
// away (horseshoe = secondary). Only the jersey actually differs: a navy body at home vs a white
// body away, with the four shoulder bars (2 per sleeve) and the numerals matching the body's
// contrast.

import {
  COLTS_DECAL_HORSESHOE_PATH,
  COLTS_SHOULDER_BAR_INNER_LEFT,
  COLTS_SHOULDER_BAR_INNER_RIGHT,
  COLTS_SHOULDER_BAR_OUTER_LEFT,
  COLTS_SHOULDER_BAR_OUTER_RIGHT,
} from './colts';
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

// Two canted bars per sleeve, mirrored. Same painting in both kits; only the color differs,
// which the jersey part supplies.
function shoulderBars(color: string): PartLayer[] {
  return [
    fill('colts-shoulder-bar-inner-left', 'sleeve-left', COLTS_SHOULDER_BAR_INNER_LEFT, color),
    fill('colts-shoulder-bar-inner-right', 'sleeve-right', COLTS_SHOULDER_BAR_INNER_RIGHT, color),
    fill('colts-shoulder-bar-outer-left', 'sleeve-left', COLTS_SHOULDER_BAR_OUTER_LEFT, color),
    fill('colts-shoulder-bar-outer-right', 'sleeve-right', COLTS_SHOULDER_BAR_OUTER_RIGHT, color),
  ];
}

// The white shell with the navy horseshoe decal — one object, shared by both kits. The horseshoe
// is a closed band requiring evenodd so the tiny enclosed counter punches through.
//
// Speedway-grey cage. The 2020 helmet update carries a "light gray facemask" (Riddell/sports
// sources; the white shell + light cage is low-contrast in the GUD composite, which reads the
// bars at ~#868686 on both figures). #A2AAAD is the team's own speedway grey from the curated
// home row — closer to the real light cage than the shared neutral #4b5158 it replaces.
const HELMET_WHITE_HORSESHOE: UniformPart = {
  base: 'white',
  facemask: 'speedwayGrey',
  layers: [
    {
      id: 'colts-helmet-horseshoe',
      surface: 'helmet',
      d: COLTS_DECAL_HORSESHOE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'navy',
      fillRule: 'evenodd',
    },
  ],
};

// Home jersey: navy body, white shoulder bars, white numerals.
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: shoulderBars('white'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey: white body, navy shoulder bars, navy numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: shoulderBars('navy'),
  number: { fill: 'navy', outline: 'navy', outlineWidth: 10 },
};

// Plain white pants, shared by both kits.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const COLTS_PARTS: TeamPartsDefinition = {
  teamId: 'colts',
  // Jersey hexes from the curated rows (teamcolorcodes): royal navy + speedway grey, the three
  // colors the two rows already carry across their primary/secondary/accent slots.
  palette: {
    navy: '#002C5F',
    white: '#FFFFFF',
    speedwayGrey: '#A2AAAD',
  },
  helmets: { 'white-horseshoe': HELMET_WHITE_HORSESHOE },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'white-horseshoe', jersey: 'navy', pants: 'white' },
    away: { helmet: 'white-horseshoe', jersey: 'white', pants: 'white' },
  },
};

export const COLTS_UNIFORMS_FROM_PARTS = compileParts(COLTS_PARTS);
