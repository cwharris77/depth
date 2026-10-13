import { COMMANDERS_2026_HELMET } from './marks/primary-2026';
import {
  COMMANDERS_JERSEY_BURGUNDY_2026,
  COMMANDERS_JERSEY_WHITE_2026,
} from './jerseys/primary-2026';
// Washington as a complete team spec: every helmet, jersey and pants part, with its own art drawn
// by the marks in ./marks. The burgundy jersey is shared by the home and 70s-burgundy kits.
import type { TeamSpec } from '../core/team-spec';
import { COMMANDERS_W_DECAL } from './marks/construction';
import { COMMANDERS_JERSEY_BURGUNDY } from './jerseys/burgundy';
import { COMMANDERS_JERSEY_WHITE } from './jerseys/white';

export const COMMANDERS_PALETTE = {
  burgundy: '#5A1414',
  gold: '#FFB612',
  white: '#FFFFFF',
  // The away numeral's outline.
  black: '#000000',
};

export const COMMANDERS_SPEC: TeamSpec = {
  helmets: {
    'burgundy-2026': {
      shell: 'burgundy',
      facemask: 'gold',
      decal: COMMANDERS_2026_HELMET,
      number: 'none',
    },
    // The burgundy shell with a white cage, worn with every jersey.
    burgundy: { shell: 'burgundy', facemask: 'white', decal: COMMANDERS_W_DECAL, number: 'none' },
  },
  jerseys: {
    'burgundy-2026': COMMANDERS_JERSEY_BURGUNDY_2026,
    'white-2026': COMMANDERS_JERSEY_WHITE_2026,
    burgundy: COMMANDERS_JERSEY_BURGUNDY,
    white: COMMANDERS_JERSEY_WHITE,
  },
  pants: {
    'white-2026': {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'burgundy', size: 'm' },
          { color: 'gold', size: 'm' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    'burgundy-2026': {
      body: 'burgundy',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 'm' },
          { color: 'gold', size: 'm' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    burgundy: { body: 'burgundy', stripes: 'none', marks: [] },
    white: { body: 'white', stripes: 'none', marks: [] },
  },
  socks: { white: { color: 'white', stripes: 'none' } },
};
