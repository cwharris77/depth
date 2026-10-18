// San Francisco as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import {
  NINERS_BLACK_DECAL,
  NINERS_GOLD_DECAL,
  NINERS_THROWBACK_DECAL,
} from './marks/construction';
import { NINERS_JERSEY_BLACK } from './jerseys/black';
import { NINERS_JERSEY_RED } from './jerseys/red';
import { NINERS_JERSEY_WHITE } from './jerseys/white';
import { NINERS_THROWBACK_RED, NINERS_THROWBACK_WHITE } from './jerseys/throwbacks';

// The decal keyline is its own colour because it stays black on both the gold and the black shell.
export const NINERS_PALETTE = {
  red: '#AA0000',
  gold: '#B3995D',
  white: '#FFFFFF',
  black: '#101820',
  decalBlack: '#141414',
};

export const NINERS_SPEC: TeamSpec = {
  helmets: {
    // The gold shell with the shared grey cage.
    gold: { shell: 'gold', facemask: 'neutral', decal: NINERS_GOLD_DECAL, number: 'none' },
    'throwback-gold': {
      shell: 'gold',
      facemask: 'neutral',
      decal: NINERS_THROWBACK_DECAL,
      number: 'none',
    },
    // The black shell with a gold cage.
    black: { shell: 'black', facemask: 'gold', decal: NINERS_BLACK_DECAL, number: 'none' },
  },
  jerseys: {
    red: NINERS_JERSEY_RED,
    white: NINERS_JERSEY_WHITE,
    black: NINERS_JERSEY_BLACK,
    'throwback-red': NINERS_THROWBACK_RED,
    'throwback-white': NINERS_THROWBACK_WHITE,
  },
  pants: {
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'black', size: 's' },
          { color: 'red', size: 'm' },
          { color: 'black', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // A red, white, red stripe down the side seam.
    gold: {
      body: 'gold',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 's' },
          { color: 'white', size: 'm' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // Two red stripes down the side seam, the black showing between them.
    black: {
      body: 'black',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 's' },
          { color: 'red', size: 's' },
        ],
        gap: 'narrow',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    red: { color: 'red', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
  },
};
