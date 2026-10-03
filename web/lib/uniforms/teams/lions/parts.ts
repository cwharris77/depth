// Detroit as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { LIONS_HELMET_DECAL } from './marks/construction';
import { LIONS_JERSEY_BLUE } from './jerseys/blue';
import { LIONS_JERSEY_GRAY } from './jerseys/gray';
import { LIONS_JERSEY_WHITE } from './jerseys/white';

// Honolulu blue and silver are the physical colours; the silver shell and pants share one key.
export const LIONS_PALETTE = {
  blue: '#0076B6',
  white: '#FFFFFF',
  silver: '#B0B7BC',
};

const none = 'none' as const;

export const LIONS_SPEC: TeamSpec = {
  helmets: {
    // The silver shell with the leaping-lion decal and a silver cage, on every kit.
    'silver-lion': {
      shell: 'silver',
      facemask: 'silver',
      decal: LIONS_HELMET_DECAL,
      number: none,
    },
  },
  jerseys: {
    blue: LIONS_JERSEY_BLUE,
    white: LIONS_JERSEY_WHITE,
    gray: LIONS_JERSEY_GRAY,
  },
  pants: {
    blue: { body: 'blue', stripes: none, marks: [] },
    silver: { body: 'silver', stripes: none, marks: [] },
    white: { body: 'white', stripes: none, marks: [] },
  },
  socks: {
    blue: { color: 'blue', stripes: none },
    white: { color: 'white', stripes: none },
    silver: { color: 'silver', stripes: none },
  },
};
