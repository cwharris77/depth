// Kansas City as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { CHIEFS_ARROWHEAD_DECAL } from './marks/construction';
import { CHIEFS_JERSEY_RED } from './jerseys/red';
import { CHIEFS_JERSEY_WHITE } from './jerseys/white';

export const CHIEFS_PALETTE = {
  red: '#E31837',
  gold: '#FFB81C',
  white: '#FFFFFF',
  black: '#010101',
  // The light-grey facemask cage.
  grey: '#868686',
};

export const CHIEFS_SPEC: TeamSpec = {
  helmets: {
    // The red arrowhead shell on both kits, with a light-grey cage.
    'red-arrowhead': {
      shell: 'red',
      facemask: 'grey',
      decal: CHIEFS_ARROWHEAD_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    red: CHIEFS_JERSEY_RED,
    white: CHIEFS_JERSEY_WHITE,
  },
  pants: {
    // A red-gold-red stripe down the side seam.
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 's' },
          { color: 'gold', size: 's' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // A white-red-gold-red-white stripe on the red body.
    red: {
      body: 'red',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 's' },
          { color: 'red', size: 's' },
          { color: 'gold', size: 's' },
          { color: 'red', size: 's' },
          { color: 'white', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    // A red-gold-red hoop around the white calf.
    white: {
      color: 'white',
      stripes: {
        bands: [
          { color: 'red', size: 's' },
          { color: 'gold', size: 'm' },
          { color: 'red', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
    },
    // A white-gold-white hoop around the red calf.
    red: {
      color: 'red',
      stripes: {
        bands: [
          { color: 'white', size: 's' },
          { color: 'gold', size: 'm' },
          { color: 'white', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
    },
  },
};
