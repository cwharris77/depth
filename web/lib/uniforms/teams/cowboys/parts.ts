// Dallas as a complete team spec: every helmet, jersey, pants and socks part, with its own art drawn
// by the marks in ./marks. Both kits share the silver star helmet; the navy jersey takes white
// pants and the white jersey silver-blue pants with royal socks.
import type { TeamSpec } from '../core/team-spec';
import { COWBOYS_STAR_DECAL } from './marks/construction';
import { COWBOYS_JERSEY_NAVY } from './jerseys/navy';
import { COWBOYS_JERSEY_WHITE } from './jerseys/white';

export const COWBOYS_PALETTE = {
  navy: '#003594',
  white: '#FFFFFF',
  // The navy jersey's body, the sleeve star and the away stripes' edges.
  deepNavy: '#041E42',
  // The star decal's own navy and white, kept apart from the jersey navy and white.
  sourceNavy: '#032343',
  sourceWhite: '#FCFCFC',
  silver: '#869397',
  // The helmet shell, several steps lighter than the jersey silver.
  helmetSilver: '#B0B7BC',
  // The white jersey's silver-blue pants as a flat approximation of the metallic fabric.
  pantsSilverBlue: '#83AEC6',
  // The cage bars, darker than the shell.
  steelGrey: '#808080',
};

// A side-seam stripe on the leg's outer edge: two outer bands around a wider centre, stopping at
// the hem.
const legStripe = (outer: string, middle: string) => ({
  position: 'leg-edge' as const,
  bands: [
    { color: outer, size: 's' as const },
    { color: middle, size: 'm' as const },
    { color: outer, size: 's' as const },
  ],
  gap: 'none' as const,
  edge: 'none' as const,
});

export const COWBOYS_SPEC: TeamSpec = {
  helmets: {
    'silver-star': {
      shell: 'helmetSilver',
      facemask: 'steelGrey',
      decal: COWBOYS_STAR_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    navy: COWBOYS_JERSEY_NAVY,
    white: COWBOYS_JERSEY_WHITE,
  },
  pants: {
    white: { body: 'white', stripes: legStripe('deepNavy', 'silver'), marks: [] },
    silverBlue: { body: 'pantsSilverBlue', stripes: legStripe('navy', 'white'), marks: [] },
  },
  socks: {
    royal: { color: 'navy', stripes: 'none' },
  },
};
