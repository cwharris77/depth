// Washington as a complete team spec: every helmet, jersey and pants part, with its own art drawn
// by the marks in ./marks. The burgundy jersey is shared by the home and 70s-burgundy kits.
import type { TeamSpec } from '../core/team-spec';
import { COMMANDERS_W_DECAL } from './marks/construction';
import { COMMANDERS_JERSEY_BURGUNDY } from './jerseys/burgundy';
import { COMMANDERS_JERSEY_WHITE } from './jerseys/white';

export const COMMANDERS_PALETTE = { burgundy: '#5A1414', gold: '#FFB612', white: '#FFFFFF' };

export const COMMANDERS_SPEC: TeamSpec = {
  helmets: {
    // The burgundy shell with a white cage, worn with every jersey.
    burgundy: { shell: 'burgundy', facemask: 'white', decal: COMMANDERS_W_DECAL, number: 'none' },
  },
  jerseys: {
    burgundy: COMMANDERS_JERSEY_BURGUNDY,
    white: COMMANDERS_JERSEY_WHITE,
  },
  pants: {
    burgundy: { body: 'burgundy', stripes: 'none', marks: [] },
    white: { body: 'white', stripes: 'none', marks: [] },
  },
  socks: {},
};
