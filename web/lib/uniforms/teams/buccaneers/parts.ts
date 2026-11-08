// Tampa Bay as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// Not one construction. The current kits wear a single solid band at the sleeve hem and a shared
// inset-V collar, with a pewter shell, the flag decal and a black cage; the creamsicle wears a
// three-band cuff, red over white over red, an orange inset-V collar, on a white shell with a crown
// stripe and its own decal. Each pants' side-seam stripe reads along the leg's outer edge.
import { BUCCANEERS_SHIP_COLORS } from './marks/ship';
import type { TeamSpec } from '../core/team-spec';
import {
  BUCCANEERS_CREAMSICLE_DECAL_PATHS_COLORS,
  BUCCANEERS_FLAG_DECAL_PATHS_COLORS,
} from './marks/decal';
import { BUCCANEERS_CREAMSICLE_DECAL, BUCCANEERS_FLAG_DECAL } from './marks/construction';
import { BUCCANEERS_JERSEY_CREAMSICLE } from './jerseys/creamsicle';
import { BUCCANEERS_JERSEY_PEWTER } from './jerseys/pewter';
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
  // Black for the cage, socks and pants trim; a flat approximation.
  black: '#0A0A08',
  ...BUCCANEERS_SHIP_COLORS,
  ...BUCCANEERS_FLAG_DECAL_PATHS_COLORS,
  ...BUCCANEERS_CREAMSICLE_DECAL_PATHS_COLORS,
};

// Half of a symmetric side-seam stripe, from the leg's outer edge inward.
const seamPants = (body: string, outer: string, inner: string) => ({
  body,
  stripes: {
    position: 'leg-edge' as const,
    bands: [
      { color: outer, size: 's' as const },
      { color: inner, size: 's' as const },
    ],
    gap: 'none' as const,
    edge: 'none',
  },
  marks: [],
});
const plainSocks = (color: string) => ({ color, stripes: 'none' as const });

export const BUCCANEERS_SPEC: TeamSpec = {
  helmets: {
    // The pewter shell with the flag decal and a black cage.
    'pewter-flag': {
      shell: 'pewter',
      facemask: 'black',
      decal: BUCCANEERS_FLAG_DECAL,
      number: 'none',
    },
    // The white shell with the creamsicle decal and an orange cage.
    white: {
      shell: 'white',
      facemask: 'creamOrange',
      decal: BUCCANEERS_CREAMSICLE_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    red: BUCCANEERS_JERSEY_RED,
    white: BUCCANEERS_JERSEY_WHITE,
    creamsicle: BUCCANEERS_JERSEY_CREAMSICLE,
    pewter: BUCCANEERS_JERSEY_PEWTER,
  },
  pants: {
    white: seamPants('white', 'black', 'red'),
    pewter: seamPants('pewter', 'black', 'red'),
    creamsicle: seamPants('white', 'crimson', 'creamOrange'),
  },
  socks: {
    pewter: plainSocks('pewter'),
    black: plainSocks('black'),
    creamsicle: plainSocks('creamOrange'),
  },
};
