// New York as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { GIANTS_MONOGRAM_DECAL } from './marks/construction';
import { GIANTS_JERSEY_ROYAL } from './jerseys/royal';
import { GIANTS_JERSEY_THROWBACK } from './jerseys/throwback';
import { GIANTS_JERSEY_WHITE } from './jerseys/white';

// Royal, red and white are the physical colours; each kit's primary, secondary and accent slots
// carry them in different positions, so layers name these keys instead. Cage grey is the modern
// shell's facemask and the silver of the home leg stripe.
export const GIANTS_PALETTE = {
  royal: '#0B2265',
  white: '#FFFFFF',
  red: '#A71930',
  cageGrey: '#9A9A9A',
};

const none = 'none' as const;

export const GIANTS_SPEC: TeamSpec = {
  helmets: {
    // The royal shell with the white monogram and a grey cage, on home and away.
    'blue-monogram': {
      shell: 'royal',
      facemask: 'cageGrey',
      decal: GIANTS_MONOGRAM_DECAL,
      number: none,
    },
    // The throwback's bare royal shell with a white cage.
    'blue-bare': { shell: 'royal', facemask: 'white', decal: none, number: none },
  },
  jerseys: {
    royal: GIANTS_JERSEY_ROYAL,
    white: GIANTS_JERSEY_WHITE,
    throwback: GIANTS_JERSEY_THROWBACK,
  },
  // White pants, each with its kit's leg stripe on the outer seam.
  pants: {
    home: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'royal', size: 's' },
          { color: 'cageGrey', size: 's' },
          { color: 'red', size: 's' },
          { color: 'cageGrey', size: 's' },
          { color: 'royal', size: 's' },
        ],
        gap: none,
        edge: none,
      },
      marks: [],
    },
    away: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'red', size: 's' },
          { color: 'red', size: 'l' },
          { color: 'red', size: 's' },
        ],
        gap: 'narrow',
        edge: none,
      },
      marks: [],
    },
    throwback: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'royal', size: 's' },
          { color: 'red', size: 's' },
          { color: 'royal', size: 's' },
        ],
        gap: none,
        edge: none,
      },
      marks: [],
    },
  },
  socks: {
    royal: { color: 'royal', stripes: none },
    red: { color: 'red', stripes: none },
  },
};
