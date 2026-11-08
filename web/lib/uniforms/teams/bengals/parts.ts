// Cincinnati as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks. Kits wear the orange tiger-stripe helmet, or its white
// counterpart, and differ in jersey, pants and socks.
import type { TeamSpec } from '../core/team-spec';
import { BENGALS_HELMET_DECAL, bengalsKneeClaws, bengalsPantsTigers } from './marks/construction';
import { BENGALS_JERSEY_BLACK } from './jerseys/black';
import { BENGALS_JERSEY_WHITE } from './jerseys/white';
import { BENGALS_JERSEY_ORANGE } from './jerseys/orange';
import { BENGALS_JERSEY_COLOR_RUSH } from './jerseys/color-rush';

export const BENGALS_PALETTE = { orange: '#FB4F14', black: '#000000', white: '#FFFFFF' };

// Every current pair carries tiger stripes down its side panels.
const tigerPants = (body: string, stripes: string) => ({
  body,
  stripes: 'none' as const,
  marks: [{ paint: 'over' as const, mark: bengalsPantsTigers(stripes) }],
});

export const BENGALS_SPEC: TeamSpec = {
  helmets: {
    // The orange shell with black tiger stripes and a black cage.
    orange: { shell: 'orange', facemask: 'black', decal: BENGALS_HELMET_DECAL, number: 'none' },
    // The same stripes and black cage on a white shell.
    white: { shell: 'white', facemask: 'black', decal: BENGALS_HELMET_DECAL, number: 'none' },
  },
  jerseys: {
    black: BENGALS_JERSEY_BLACK,
    white: BENGALS_JERSEY_WHITE,
    orange: BENGALS_JERSEY_ORANGE,
    'color-rush': BENGALS_JERSEY_COLOR_RUSH,
  },
  pants: {
    black: tigerPants('black', 'orange'),
    white: tigerPants('white', 'black'),
    'white-orange': tigerPants('white', 'orange'),
    orange: tigerPants('orange', 'black'),
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
