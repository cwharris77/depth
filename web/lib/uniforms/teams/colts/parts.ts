// Indianapolis as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { COLTS_HORSESHOE_DECAL, COLTS_NIGHTS_HELMET_DECAL } from './marks/construction';
import { COLTS_JERSEY_INDIANA_NIGHTS } from './jerseys/indiana-nights';
import { COLTS_JERSEY_NAVY } from './jerseys/navy';
import { COLTS_JERSEY_WHITE } from './jerseys/white';

export const COLTS_PALETTE = {
  navy: '#002C5F',
  white: '#FFFFFF',
  speedwayGrey: '#A2AAAD',
  black: '#000000',
};

export const COLTS_SPEC: TeamSpec = {
  helmets: {
    // The white horseshoe shell with its navy crown stripe, on home and away, with a light grey
    // cage.
    'white-horseshoe': {
      shell: 'white',
      facemask: 'speedwayGrey',
      decal: COLTS_HORSESHOE_DECAL,
      number: 'none',
    },
    // The black alternate shell and cage, with a white-piped navy stripe and a white-keyed
    // horseshoe.
    'indiana-nights': {
      shell: 'black',
      facemask: 'black',
      decal: COLTS_NIGHTS_HELMET_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    navy: COLTS_JERSEY_NAVY,
    white: COLTS_JERSEY_WHITE,
    'indiana-nights': COLTS_JERSEY_INDIANA_NIGHTS,
  },
  pants: {
    // Two equal navy stripes down the side seam, stopping at the hem.
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'navy', size: 's' },
          { color: 'navy', size: 's' },
        ],
        gap: 'wide',
        edge: 'none',
      },
      marks: [],
    },
    // The same two equal stripes in white on the blue alternate pants.
    navy: {
      body: 'navy',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 's' },
          { color: 'white', size: 's' },
        ],
        gap: 'wide',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
  },
};
