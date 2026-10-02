// Cincinnati as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks. All kits wear the same orange tiger-stripe helmet and differ
// in jersey, pants and socks.
import type { TeamSpec } from '../core/team-spec';
import { BENGALS_HELMET_DECAL, bengalsKneeClaws } from './marks/construction';
import { BENGALS_JERSEY_BLACK } from './jerseys/black';
import { BENGALS_JERSEY_WHITE } from './jerseys/white';
import { BENGALS_JERSEY_ORANGE } from './jerseys/orange';
import { BENGALS_JERSEY_COLOR_RUSH } from './jerseys/color-rush';

export const BENGALS_PALETTE = { orange: '#FB4F14', black: '#000000', white: '#FFFFFF' };

const plainPants = (body: string) => ({ body, stripes: 'none' as const, marks: [] });

export const BENGALS_SPEC: TeamSpec = {
  helmets: {
    // The orange shell with black tiger stripes and a black cage.
    orange: { shell: 'orange', facemask: 'black', decal: BENGALS_HELMET_DECAL, number: 'none' },
  },
  jerseys: {
    black: BENGALS_JERSEY_BLACK,
    white: BENGALS_JERSEY_WHITE,
    orange: BENGALS_JERSEY_ORANGE,
    'color-rush': BENGALS_JERSEY_COLOR_RUSH,
  },
  pants: {
    black: plainPants('black'),
    white: plainPants('white'),
    orange: plainPants('orange'),
    // The Color Rush pants carry a black claw on each outer knee.
    'white-claws': {
      body: 'white',
      stripes: 'none',
      marks: [{ paint: 'over', mark: bengalsKneeClaws('black') }],
    },
  },
  socks: {
    black: { color: 'black', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
    orange: { color: 'orange', stripes: 'none' },
  },
};
