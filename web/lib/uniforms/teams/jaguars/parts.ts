// Jacksonville as a complete team spec: every helmet, jersey, pants and socks part, with its own
// art drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { JAGUARS_DECAL_PATHS } from './marks/decal';
import { JAGUARS_HELMET_DECAL } from './marks/construction';
import { JAGUARS_JERSEY_BLACK_ALT } from './jerseys/black-alt';
import { JAGUARS_JERSEY_TEAL } from './jerseys/teal';
import { JAGUARS_JERSEY_THROWBACK } from './jerseys/throwback';
import { JAGUARS_JERSEY_WHITE } from './jerseys/white';

// Teal, gold, black and white are the physical colours. Every decal fill is kept from the
// supplied artwork, including its minor shading, and is its own key.
export const JAGUARS_PALETTE = {
  teal: '#006778',
  gold: '#D7A22A',
  black: '#101820',
  white: '#FFFFFF',
  ...Object.fromEntries(JAGUARS_DECAL_PATHS.map(({ fill }) => [fill, fill])),
};

const none = 'none' as const;

export const JAGUARS_SPEC: TeamSpec = {
  helmets: {
    // The black shell with the jaguar-head decal and a black cage, on every current kit.
    black: { shell: 'black', facemask: 'black', decal: JAGUARS_HELMET_DECAL, number: none },
    // The throwback's bare black shell.
    'black-bare': { shell: 'black', facemask: 'black', decal: none, number: none },
  },
  jerseys: {
    teal: JAGUARS_JERSEY_TEAL,
    white: JAGUARS_JERSEY_WHITE,
    throwback: JAGUARS_JERSEY_THROWBACK,
    'black-alt': JAGUARS_JERSEY_BLACK_ALT,
  },
  pants: {
    white: { body: 'white', stripes: none, marks: [] },
    teal: { body: 'teal', stripes: none, marks: [] },
    black: { body: 'black', stripes: none, marks: [] },
    // A wide black stripe either side of a teal one, gold-piped, down the outer seam.
    throwback: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'black', size: 's' },
          { color: 'teal', size: 'm' },
          { color: 'black', size: 's' },
        ],
        gap: 'none',
        edge: 'gold',
      },
      marks: [],
    },
  },
  socks: {
    white: { color: 'white', stripes: none },
    black: { color: 'black', stripes: none },
  },
};
