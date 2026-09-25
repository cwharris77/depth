// Chicago as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { BEARS_C_DECAL } from './marks/construction';
import { BEARS_JERSEY_NAVY } from './jerseys/navy';
import { BEARS_JERSEY_ORANGE } from './jerseys/orange';
import { BEARS_JERSEY_WHITE } from './jerseys/white';

// Jersey hexes — the same three the curated rows carry.
export const BEARS_PALETTE = { navy: '#0B162A', orange: '#C83803', white: '#FFFFFF' };

// Three equal stripes on the leg's seam line, stopping at the hem.
const seamStripe = (outer: string, middle: string) => ({
  position: 'center' as const,
  bands: [
    { color: outer, size: 's' as const },
    { color: middle, size: 's' as const },
    { color: outer, size: 's' as const },
  ],
  gap: 'none' as const,
  edge: 'none' as const,
});

export const BEARS_SPEC: TeamSpec = {
  helmets: {
    // The one shell, on every kit. The cage is painted the shell navy rather than a neutral.
    'navy-c': { shell: 'navy', facemask: 'navy', decal: BEARS_C_DECAL, number: 'none' },
  },
  jerseys: {
    navy: BEARS_JERSEY_NAVY,
    white: BEARS_JERSEY_WHITE,
    orange: BEARS_JERSEY_ORANGE,
  },
  pants: {
    navy: { body: 'navy', stripes: seamStripe('orange', 'white'), marks: [] },
    white: { body: 'white', stripes: seamStripe('navy', 'orange'), marks: [] },
  },
  socks: {
    // Worn with the navy pants.
    white: {
      color: 'white',
      stripes: {
        bands: [
          { color: 'navy', size: 'm' },
          { color: 'orange', size: 'm' },
          { color: 'navy', size: 'm' },
        ],
        gap: 'wide',
        edge: 'none',
      },
    },
    // Worn with the white pants.
    navy: {
      color: 'navy',
      stripes: {
        bands: [
          { color: 'orange', size: 'm' },
          { color: 'orange', size: 'm' },
          { color: 'orange', size: 'm' },
        ],
        gap: 'wide',
        edge: 'white',
      },
    },
  },
};
