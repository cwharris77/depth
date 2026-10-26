// New Orleans as a complete team spec: the one gold fleur shell, the black and white jerseys and
// the gold and black pants, with the fleur and crown stripe drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { SAINTS_FLEUR_DECAL } from './marks/construction';
import { SAINTS_JERSEY_BLACK } from './jerseys/black';
import { SAINTS_JERSEY_WHITE } from './jerseys/white';

export const SAINTS_PALETTE = {
  gold: '#D3BC8D',
  black: '#101820',
  white: '#FFFFFF',
  'decal-black': '#010001',
  'decal-gold': '#D1BB8F',
  'decal-white': '#F9F9F9',
};

export const SAINTS_SPEC: TeamSpec = {
  helmets: {
    // A gold shell with a black cage, carrying the fleur and a black-white-black crown stripe.
    'gold-fleur': {
      shell: 'gold',
      facemask: 'black',
      decal: SAINTS_FLEUR_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    black: SAINTS_JERSEY_BLACK,
    white: SAINTS_JERSEY_WHITE,
  },
  pants: {
    // Gold with one wide black stripe on the side seam, which reads as a sliver at the front edge;
    // black unbroken.
    gold: {
      body: 'gold',
      stripes: {
        position: 'leg-edge',
        bands: [{ color: 'black', size: 's' }],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    black: { body: 'black', stripes: 'none', marks: [] },
  },
  socks: {
    // Black socks on every kit, including under the gold pants.
    black: { color: 'black', stripes: 'none' },
  },
};
