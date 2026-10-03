// Dallas as a complete team spec: every helmet, jersey and pants part, with its own art drawn by
// the marks in ./marks. Both kits share the silver star helmet and the white pants; the jerseys are
// separate constructions.
import type { TeamSpec } from '../core/team-spec';
import { COWBOYS_STAR_DECAL } from './marks/construction';
import { COWBOYS_JERSEY_NAVY } from './jerseys/navy';
import { COWBOYS_JERSEY_WHITE } from './jerseys/white';

export const COWBOYS_PALETTE = {
  navy: '#003594',
  white: '#FFFFFF',
  // The star decal's own navy and white, kept apart from the jersey navy and white.
  sourceNavy: '#032343',
  sourceWhite: '#FCFCFC',
  silver: '#869397',
  // The helmet shell, several steps lighter than the jersey silver.
  helmetSilver: '#B0B7BC',
  // The cage bars, darker than the shell.
  steelGrey: '#808080',
};

export const COWBOYS_SPEC: TeamSpec = {
  helmets: {
    'silver-star': {
      shell: 'helmetSilver',
      facemask: 'steelGrey',
      decal: COWBOYS_STAR_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    navy: COWBOYS_JERSEY_NAVY,
    white: COWBOYS_JERSEY_WHITE,
  },
  pants: {
    white: { body: 'white', stripes: 'none', marks: [] },
  },
  socks: {},
};
