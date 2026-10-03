// Baltimore as a complete team spec: every helmet, jersey and pants part, with its own art drawn
// by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { RAVENS_HELMET_DECAL } from './marks/construction';
import { RAVENS_JERSEY_BLACK } from './jerseys/black';
import { RAVENS_JERSEY_PURPLE } from './jerseys/purple';
import { RAVENS_JERSEY_WHITE } from './jerseys/white';

// Two golds: the shoulder keyline and numeral outline use `gold`, while the helmet mark's own
// gold is a slightly deeper value.
export const RAVENS_PALETTE = {
  purple: '#241773',
  black: '#000000',
  white: '#FFFFFF',
  gold: '#9E7C0C',
  decalGold: '#9A7611',
  red: '#C60C30',
};

export const RAVENS_SPEC: TeamSpec = {
  helmets: {
    // One black shell with a black cage and the raven head, worn on every kit.
    black: { shell: 'black', facemask: 'black', decal: RAVENS_HELMET_DECAL, number: 'none' },
  },
  jerseys: {
    purple: RAVENS_JERSEY_PURPLE,
    white: RAVENS_JERSEY_WHITE,
    black: RAVENS_JERSEY_BLACK,
  },
  pants: {
    // Purple and unbroken.
    purple: { body: 'purple', stripes: 'none', marks: [] },
  },
  socks: {},
};
