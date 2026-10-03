import type { TeamSpec } from '../core/team-spec';
import { TEXANS_BATTLE_RED_HORN, TEXANS_BULL } from './marks/construction';
import { TEXANS_JERSEY_NAVY } from './jerseys/navy';
import { TEXANS_JERSEY_RED } from './jerseys/red';
import { TEXANS_JERSEY_WHITE } from './jerseys/white';

export const TEXANS_PALETTE = {
  navy: '#03202F',
  red: '#A71930',
  white: '#FFFFFF',
  decalNavy: '#031825',
  decalRed: '#C80023',
};

export const TEXANS_SPEC: TeamSpec = {
  helmets: {
    'navy-bull': { shell: 'navy', facemask: 'navy', decal: TEXANS_BULL, number: 'none' },
    'red-horn': { shell: 'red', facemask: 'red', decal: TEXANS_BATTLE_RED_HORN, number: 'none' },
  },
  jerseys: {
    navy: TEXANS_JERSEY_NAVY,
    white: TEXANS_JERSEY_WHITE,
    red: TEXANS_JERSEY_RED,
  },
  pants: {
    white: {
      body: 'white',
      stripes: 'none',
      marks: [],
    },
    navy: {
      body: 'navy',
      stripes: 'none',
      marks: [],
    },
    red: {
      body: 'red',
      stripes: 'none',
      marks: [],
    },
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
    red: { color: 'red', stripes: 'none' },
  },
};
