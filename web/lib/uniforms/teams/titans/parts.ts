import type { TeamSpec } from '../core/team-spec';
import {
  TITANS_2018_HELMET,
  TITANS_2018_PANTS_SWORD,
  TITANS_2026_HELMET,
  OILERS_1960_HELMET,
} from './marks/construction';
import { TITANS_FLAMING_T_PATHS } from './marks/flaming-t';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_NAVY_ALT } from './jerseys/navy-alt';
import { JERSEY_LIGHT_BLUE } from './jerseys/light-blue';
import { JERSEY_BLUE_2025 } from './jerseys/blue-2025';
import { JERSEY_BLUE_2026 } from './jerseys/blue-2026';
import { JERSEY_WHITE_2026 } from './jerseys/white-2026';

export const TITANS_PALETTE = {
  navy: '#0C2340',
  lightBlue: '#4B92DB',
  red: '#C8102E',
  white: '#FFFFFF',
  silver: '#A5ACAF',
  lightBlue2026: '#4495D2',
  red2026: '#D50A0A',
  ...Object.fromEntries(TITANS_FLAMING_T_PATHS.map(({ fill }) => [fill, fill])),
};

export const TITANS_SPEC: TeamSpec = {
  helmets: {
    'navy-t': { shell: 'navy', facemask: 'silver', decal: TITANS_2018_HELMET, number: 'none' },
    oilers: { shell: 'lightBlue', facemask: 'silver', decal: OILERS_1960_HELMET, number: 'none' },
    'white-2026': { shell: 'white', facemask: 'white', decal: TITANS_2026_HELMET, number: 'none' },
  },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    'navy-alt': JERSEY_NAVY_ALT,
    'light-blue': JERSEY_LIGHT_BLUE,
    'blue-2025': JERSEY_BLUE_2025,
    'blue-2026': JERSEY_BLUE_2026,
    'white-2026': JERSEY_WHITE_2026,
  },
  pants: {
    navy: {
      body: 'navy',
      stripes: 'none',
      marks: [{ paint: 'over', mark: TITANS_2018_PANTS_SWORD }],
    },
    white: {
      body: 'white',
      stripes: 'none',
      marks: [{ paint: 'over', mark: TITANS_2018_PANTS_SWORD }],
    },
    oilers: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 's' },
          { color: 'lightBlue', size: 'm' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    'white-2026': {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red2026', size: 's' },
          { color: 'lightBlue2026', size: 's' },
          { color: 'navy', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    'blue-2026': {
      body: 'lightBlue2026',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red2026', size: 's' },
          { color: 'white', size: 's' },
          { color: 'navy', size: 's' },
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
    oilers: {
      color: 'lightBlue',
      stripes: {
        bands: [
          { color: 'red', size: 's' },
          { color: 'white', size: 's' },
          { color: 'red', size: 's' },
        ],
        gap: 'narrow',
        edge: 'none',
      },
    },
    lightBlue: { color: 'lightBlue', stripes: 'none' },
    lightBlue2026: { color: 'lightBlue2026', stripes: 'none' },
  },
};
