// Las Vegas as a complete team spec: every helmet, jersey, pants and socks part. Both kits wear
// the same silver shell with the shield decal, the same silver pants and the same black socks;
// only the jersey body differs, black at home and white away.
import type { TeamSpec } from '../core/team-spec';
import { RAIDERS_HELMET_DECAL } from './marks/construction';
import { RAIDERS_JERSEY_BLACK } from './jerseys/black';
import { RAIDERS_JERSEY_WHITE } from './jerseys/white';

// Silver is the shell and pants colour on both kits.
export const RAIDERS_PALETTE = { black: '#000000', white: '#FFFFFF', silver: '#A5ACAF' };

export const RAIDERS_SPEC: TeamSpec = {
  helmets: {
    // The silver shell with the shield decal and a black cage.
    'silver-shield': {
      shell: 'silver',
      facemask: 'black',
      decal: RAIDERS_HELMET_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    black: RAIDERS_JERSEY_BLACK,
    white: RAIDERS_JERSEY_WHITE,
  },
  pants: {
    // One black stripe down the side seam, stopping at the hem.
    silver: {
      body: 'silver',
      stripes: {
        position: 'leg-edge',
        bands: [{ color: 'black', size: 's' }],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    black: { color: 'black', stripes: 'none' },
  },
};
