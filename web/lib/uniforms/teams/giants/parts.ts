// New York as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { GIANTS_MONOGRAM_DECAL, GIANTS_WORDMARK_DECAL } from './marks/construction';
import { GIANTS_JERSEY_ROYAL } from './jerseys/royal';
import { GIANTS_JERSEY_THROWBACK } from './jerseys/throwback';
import { GIANTS_JERSEY_VINTAGE_WHITE } from './jerseys/vintage-white';
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
    // The royal shell with the red centre stripe, the white monogram and a grey cage, on home and
    // away.
    'blue-monogram': {
      shell: 'royal',
      facemask: 'cageGrey',
      decal: GIANTS_MONOGRAM_DECAL,
      number: none,
    },
    // The classic shell with the red centre stripe, the white underlined wordmark and a white
    // cage, worn with the throwback and the vintage white jerseys.
    'navy-wordmark': {
      shell: 'royal',
      facemask: 'white',
      decal: GIANTS_WORDMARK_DECAL,
      number: none,
    },
  },
  jerseys: {
    royal: GIANTS_JERSEY_ROYAL,
    white: GIANTS_JERSEY_WHITE,
    throwback: GIANTS_JERSEY_THROWBACK,
    'vintage-white': GIANTS_JERSEY_VINTAGE_WHITE,
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
    white: { color: 'white', stripes: none },
  },
};
