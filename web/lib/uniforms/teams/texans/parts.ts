import type { TeamSpec } from '../core/team-spec';
import { TEXANS_BATTLE_RED_HORN, TEXANS_BULL, TEXANS_H } from './marks/construction';
import { TEXANS_JERSEY_H_TOWN } from './jerseys/h-town';
import { TEXANS_JERSEY_NAVY } from './jerseys/navy';
import { TEXANS_JERSEY_RED } from './jerseys/red';
import { TEXANS_JERSEY_WHITE } from './jerseys/white';

export const TEXANS_PALETTE = {
  navy: '#03202F',
  red: '#A71930',
  white: '#FFFFFF',
  decalNavy: '#031825',
  decalRed: '#C80023',
  // H-Town Blue has no published code; this is the flat fill of the 2025 composite's H-Town
  // pants stripe.
  hTownBlue: '#0072CE',
};

export const TEXANS_SPEC: TeamSpec = {
  helmets: {
    'navy-bull': { shell: 'navy', facemask: 'navy', decal: TEXANS_BULL, number: 'none' },
    'red-horn': { shell: 'red', facemask: 'red', decal: TEXANS_BATTLE_RED_HORN, number: 'none' },
    'navy-h': { shell: 'navy', facemask: 'navy', decal: TEXANS_H, number: 'none' },
  },
  jerseys: {
    navy: TEXANS_JERSEY_NAVY,
    white: TEXANS_JERSEY_WHITE,
    red: TEXANS_JERSEY_RED,
    'h-town': TEXANS_JERSEY_H_TOWN,
  },
  pants: {
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'navy', size: 'm' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    navy: {
      body: 'navy',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 'm' },
          { color: 'white', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    red: {
      body: 'red',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'navy', size: 'm' },
          { color: 'white', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    'h-town': {
      body: 'navy',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 'm' },
          { color: 'hTownBlue', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
    red: { color: 'red', stripes: 'none' },
  },
};
