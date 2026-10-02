// Tampa Bay as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// Not one construction. The current kits wear a single solid pewter band at the sleeve hem and a
// thin collar keyline on a pewter shell with the flag decal; the creamsicle wears a three-band cuff,
// red over white over red, no collar trim, on a white shell with its own decal. Pants are plain:
// the leg stripes sit on the side seam, which a front-on mannequin cannot show.
import type { TeamSpec } from '../core/team-spec';
import {
  BUCCANEERS_CREAMSICLE_DECAL_PATHS_COLORS,
  BUCCANEERS_FLAG_DECAL_PATHS_COLORS,
} from './marks/decal';
import { BUCCANEERS_CREAMSICLE_DECAL, BUCCANEERS_FLAG_DECAL } from './marks/construction';
import { BUCCANEERS_JERSEY_CREAMSICLE } from './jerseys/creamsicle';
import { BUCCANEERS_JERSEY_RED } from './jerseys/red';
import { BUCCANEERS_JERSEY_WHITE } from './jerseys/white';

export const BUCCANEERS_PALETTE = {
  red: '#D50A0A',
  pewter: '#34302B',
  orange: '#FF7900',
  // The creamsicle's crimson and orange, distinct from the modern red and orange.
  crimson: '#C8102E',
  creamOrange: '#FF8200',
  white: '#FFFFFF',
  ...BUCCANEERS_FLAG_DECAL_PATHS_COLORS,
  ...BUCCANEERS_CREAMSICLE_DECAL_PATHS_COLORS,
};

const plainPants = (body: string) => ({ body, stripes: 'none' as const, marks: [] });
const plainSocks = (color: string) => ({ color, stripes: 'none' as const });

export const BUCCANEERS_SPEC: TeamSpec = {
  helmets: {
    // The pewter shell with the flag decal and a white cage.
    'pewter-flag': {
      shell: 'pewter',
      facemask: 'white',
      decal: BUCCANEERS_FLAG_DECAL,
      number: 'none',
    },
    // The white shell with the creamsicle decal and a white cage.
    white: {
      shell: 'white',
      facemask: 'white',
      decal: BUCCANEERS_CREAMSICLE_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    red: BUCCANEERS_JERSEY_RED,
    white: BUCCANEERS_JERSEY_WHITE,
    creamsicle: BUCCANEERS_JERSEY_CREAMSICLE,
  },
  pants: {
    white: plainPants('white'),
    pewter: plainPants('pewter'),
  },
  socks: {
    pewter: plainSocks('pewter'),
    creamsicle: plainSocks('creamOrange'),
  },
};
