// Cleveland as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// The shells carry no logo, only a three-band centre stripe; the V-collar carries no trim. The
// jerseys carry one five-band stripe stack on each sleeve, the pants a three-band seam stripe and
// the socks five hoops. The white and orange pants are independently selectable with the home and
// away jerseys.
import type { TeamSpec } from '../core/team-spec';
import {
  BROWNS_ORANGE_HELMET_STRIPE,
  BROWNS_ORANGE_PANTS_CENTRE_LINE,
  BROWNS_PANTS_CENTRE_LINE,
  BROWNS_THROWBACK_HELMET_STRIPE,
  BROWNS_WHITE_HELMET_STRIPE,
} from './marks/construction';
import { BROWNS_JERSEY_BROWN } from './jerseys/brown';
import { BROWNS_JERSEY_THROWBACK } from './jerseys/throwback';
import { BROWNS_JERSEY_WHITE } from './jerseys/white';

// Brown and orange are the two physical colors carried in different primary/secondary/accent
// slots per row; white is the pants/numerals literal.
export const BROWNS_PALETTE = {
  brown: '#311D00',
  orange: '#FF3C00',
  white: '#FFFFFF',
};

// A 16-unit band on the leg's seam line with a centre line of another colour over it, stopping at
// the hem.
const striped = (body: string, band: string, centreLine: typeof BROWNS_PANTS_CENTRE_LINE) => ({
  body,
  stripes: {
    position: 'center' as const,
    bands: [{ color: band, size: 'm' as const }],
    gap: 'none' as const,
    edge: 'none' as const,
  },
  marks: [{ paint: 'over' as const, mark: centreLine }],
});

const hoops = (outer: string) => ({
  bands: [
    { color: outer, size: 's' as const },
    { color: 'orange', size: 's' as const },
    { color: outer, size: 's' as const },
    { color: 'orange', size: 's' as const },
    { color: outer, size: 's' as const },
  ],
  gap: 'none' as const,
  edge: 'none' as const,
});

export const BROWNS_SPEC: TeamSpec = {
  helmets: {
    // The orange shell with its brown-white-brown stripe, shared by home and away, with a white
    // cage.
    orange: {
      shell: 'orange',
      facemask: 'white',
      decal: BROWNS_ORANGE_HELMET_STRIPE,
      number: 'none',
    },
    // The throwback's 2021 orange shell: a single white centre stripe, brown side numerals and the
    // grey cage.
    'orange-1946': {
      shell: 'orange',
      facemask: 'neutral',
      decal: BROWNS_THROWBACK_HELMET_STRIPE,
      number: { fill: 'brown' },
    },
    // The white shell, worn with the 1946 throwback from 2023 and with the away jersey,
    // with a brown-orange-brown stripe and a brown cage.
    white: { shell: 'white', facemask: 'brown', decal: BROWNS_WHITE_HELMET_STRIPE, number: 'none' },
  },
  jerseys: {
    brown: BROWNS_JERSEY_BROWN,
    white: BROWNS_JERSEY_WHITE,
    throwback: BROWNS_JERSEY_THROWBACK,
  },
  pants: {
    // Orange-brown-orange.
    white: striped('white', 'orange', BROWNS_PANTS_CENTRE_LINE),
    // Brown-white-brown.
    orange: striped('orange', 'brown', BROWNS_ORANGE_PANTS_CENTRE_LINE),
    // The color-rush brown pants are unstriped.
    brown: { body: 'brown', stripes: 'none', marks: [] },
  },
  socks: {
    brown: { color: 'brown', stripes: hoops('white') },
    white: { color: 'white', stripes: hoops('brown') },
  },
};
