// Philadelphia as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { EAGLES_WING_DECAL } from './marks/construction';
import { EAGLES_JERSEY_BLACK } from './jerseys/black';
import { EAGLES_JERSEY_GREEN } from './jerseys/green';
import { EAGLES_JERSEY_KELLY_MODERN } from './jerseys/kelly-modern';
import { EAGLES_JERSEY_KELLY_ORIGINAL } from './jerseys/kelly-original';
import { EAGLES_JERSEY_WHITE } from './jerseys/white';

// Green, kelly, black, white and silver are the physical colours; each kit's primary, secondary
// and accent slots carry them in different positions, so layers name these keys instead.
export const EAGLES_PALETTE = {
  green: '#004C54',
  kelly: '#046A38',
  black: '#000000',
  white: '#FFFFFF',
  silver: '#A5ACAF',
};

export const EAGLES_SPEC: TeamSpec = {
  helmets: {
    // All three shells wear the same wing, over a black cage.
    green: { shell: 'green', facemask: 'black', decal: EAGLES_WING_DECAL, number: 'none' },
    black: { shell: 'black', facemask: 'black', decal: EAGLES_WING_DECAL, number: 'none' },
    // The kelly shell wears a silver cage.
    kelly: { shell: 'kelly', facemask: 'silver', decal: EAGLES_WING_DECAL, number: 'none' },
  },
  jerseys: {
    green: EAGLES_JERSEY_GREEN,
    white: EAGLES_JERSEY_WHITE,
    black: EAGLES_JERSEY_BLACK,
    'kelly-original': EAGLES_JERSEY_KELLY_ORIGINAL,
    'kelly-modern': EAGLES_JERSEY_KELLY_MODERN,
  },
  pants: {
    // A black stripe beside a narrower green one down the side seam.
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'black', size: 'm' },
          { color: 'green', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // A white stripe beside a narrower green one.
    black: {
      body: 'black',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 'm' },
          { color: 'green', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // A black stripe beside a narrower silver one.
    green: {
      body: 'green',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'black', size: 'm' },
          { color: 'silver', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // Two kelly stripes split by a white one, every stripe piped black.
    silver: {
      body: 'silver',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'kelly', size: 's' },
          { color: 'white', size: 's' },
          { color: 'kelly', size: 's' },
        ],
        gap: 'none',
        edge: 'black',
      },
      marks: [],
    },
    // The 1987 pants: plain kelly.
    kelly: { body: 'kelly', stripes: 'none', marks: [] },
  },
  socks: {
    white: { color: 'white', stripes: 'none' },
    // Two kelly hoops piped black.
    'kelly-hoops': {
      color: 'white',
      stripes: {
        bands: [
          { color: 'kelly', size: 's' },
          { color: 'kelly', size: 's' },
        ],
        gap: 'narrow',
        edge: 'black',
      },
    },
  },
};
