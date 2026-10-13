import { FALCONS_JERSEY_RED_2026, FALCONS_JERSEY_WHITE_2026 } from './jerseys/primary-2026';
// Atlanta as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { FALCONS_DECAL, FALCONS_PANTS_STRIPE } from './marks/construction';
import { FALCONS_JERSEY_BLACK } from './jerseys/black';
import { FALCONS_JERSEY_RED } from './jerseys/red';
import { FALCONS_JERSEY_WHITE } from './jerseys/white';

// Black, white, red and silver are the physical colours; each kit's primary, secondary and accent
// slots carry them in different positions, so layers name these keys instead. Silver is the
// matte shell's cage and the decal's outer rim.
export const FALCONS_PALETTE = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#A71930',
  silver: '#A5ACAF',
};

export const FALCONS_SPEC: TeamSpec = {
  helmets: {
    // One black shell with the fixed falcon and a silver cage, on every kit.
    'black-falcon': {
      shell: 'black',
      facemask: 'silver',
      decal: FALCONS_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    'red-2026': FALCONS_JERSEY_RED_2026,
    'white-2026': FALCONS_JERSEY_WHITE_2026,
    black: FALCONS_JERSEY_BLACK,
    white: FALCONS_JERSEY_WHITE,
    red: FALCONS_JERSEY_RED,
  },
  // The same red leg stripe, framed in black, on both pants.
  pants: {
    'white-2026': {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'black', size: 's' },
          { color: 'silver', size: 's' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    'black-2026': {
      body: 'black',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 's' },
          { color: 'silver', size: 's' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    black: {
      body: 'black',
      stripes: 'none',
      marks: [{ paint: 'over', mark: FALCONS_PANTS_STRIPE }],
    },
    white: {
      body: 'white',
      stripes: 'none',
      marks: [{ paint: 'over', mark: FALCONS_PANTS_STRIPE }],
    },
  },
  socks: {
    black: { color: 'black', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
  },
};
