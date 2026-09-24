// Denver authored as composable parts: helmets, pants and palette. Jerseys are jersey specs in
// ./jerseys, expanded to layers by core/jersey-spec.
//
// The four kits resolve to two helmets: the modern NAVY shell wearing the horse (home, away,
// orange-alt share it) and the ORANGE CRUSH royal shell wearing the era's "D". Home and orange-alt
// share the orange jersey and differ only in the pants (orange vs white).
//
// The stored home palette is stale (home renders an orange body, not a navy jersey); the
// definition is authored against what the renderer resolves.

import {
  BRONCOS_CRUSH_DECAL_D_PATH,
  BRONCOS_DECAL_EYE_PATH,
  BRONCOS_CRUSH_DECAL_KEYLINE_PATH,
  BRONCOS_DECAL_HORSE_PATH,
  BRONCOS_DECAL_MANE_PATH,
} from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The horse decal: orange mane under a white head. The eye and nostril are shell-colored so they
// read through. Fixed-art colors on the navy shell.
function horseDecal(): PartLayer[] {
  return [
    fill('broncos-decal-under', 'helmet', BRONCOS_DECAL_MANE_PATH, 'orange'),
    fill('broncos-decal-over', 'helmet', BRONCOS_DECAL_HORSE_PATH, 'white'),
    fill('broncos-decal-eye', 'helmet', BRONCOS_DECAL_EYE_PATH, 'orange'),
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
// The current-season helmet composite shows a navy facemask on every modern kit; the
// Orange Crush reference below is the exception and retains its light cage.
const HELMET_NAVY_HORSE: UniformPart = expandHelmet('broncos-navy-horse-helmet', {
  shell: 'navy',
  facemask: 'navy',
  decal: placed(horseDecal()),
  number: 'none',
});

// Orange Crush's royal shell with the "D" decal.
//
// White cage. Orange Crush's royal shell also wears a white/light cage (the D-era look; the era's
// shell was royal with a light cage, and the modern navy shell's white mask is the same Riddell
// SF2BD-SW-SP we set across the league's white-cage teams). The white reads cleanly against royal.
const HELMET_ROYAL_D: UniformPart = expandHelmet('broncos-royal-d-helmet', {
  shell: 'royal',
  facemask: 'white',
  decal: placed(crushDecal()),
  number: 'none',
});

// Navy pants (home).
// Home pants, orange (the flat home inherits primary = orange).
const PANTS_ORANGE: UniformPart = { base: 'orange', layers: [] };

// White pants (away, orange-alt, orange-crush).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const BRONCOS_CONSTRUCTION = {
  teamId: 'broncos',
  // Jersey hexes from the curated rows. Navy/orange/white are the physical modern
  // body colors carried in different slots per row; royal and crush-orange are Orange Crush's era
  // colors (its primary/secondary).
  palette: {
    navy: '#002244',
    orange: '#FB4F14',
    white: '#FFFFFF',
    royal: '#001489',
    crushOrange: '#FA4616',
    // Darker shades of the modern bodies for the neck opening inside the V, so it reads without
    // an outline.
    orangeNeck: '#D9420F',
    whiteNeck: '#ECEEEF',
  },
  helmets: { 'navy-horse': HELMET_NAVY_HORSE, 'royal-d': HELMET_ROYAL_D },
  pants: { orange: PANTS_ORANGE, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'navy-horse', jersey: 'orange', pants: 'orange' },
    away: { helmet: 'navy-horse', jersey: 'white', pants: 'white' },
    'orange-alt': { helmet: 'navy-horse', jersey: 'orange', pants: 'white' },
    'orange-crush': { helmet: 'royal-d', jersey: 'crush', pants: 'white' },
  },
};

export { fill };
