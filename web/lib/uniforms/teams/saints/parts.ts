// New Orleans as a complete team spec: the one gold fleur shell, the black and white jerseys and
// the gold and black pants, with the fleur drawn by the mark in ./marks.
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
    // A gold shell with a gold cage, carrying the fleur.
    'gold-fleur': {
      shell: 'gold',
      facemask: 'gold',
      decal: SAINTS_FLEUR_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    black: SAINTS_JERSEY_BLACK,
    white: SAINTS_JERSEY_WHITE,
  },
  pants: {
    // Gold and black, both unbroken.
    gold: { body: 'gold', stripes: 'none', marks: [] },
    black: { body: 'black', stripes: 'none', marks: [] },
  },
  socks: {
    // Black socks on every kit, including under the gold pants.
    black: { color: 'black', stripes: 'none' },
  },
};
