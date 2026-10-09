// Carolina as a complete team spec: every helmet, jersey, pants and socks part, with the helmet
// mark and shoulder fan drawn by the marks in ./marks.
import type { CompletePantsSpec } from '../core/complete';
import type { TeamSpec } from '../core/team-spec';
import { PANTHERS_HELMET_DECAL } from './marks/construction';
import { PANTHERS_JERSEY_BLACK } from './jerseys/black';
import { PANTHERS_JERSEY_BLUE } from './jerseys/blue';
import { PANTHERS_JERSEY_WHITE } from './jerseys/white';

// Blue, black, silver and white are the kit colours. markSilver is the helmet mark's own fang
// highlight grey: fixed art does not recolour with the kit.
export const PANTHERS_PALETTE = {
  blue: '#0085CA',
  black: '#101820',
  silver: '#A5ACAF',
  white: '#FFFFFF',
  markSilver: '#BFC0BF',
};

// Every leg carries the same stripe: a centre band between two hairline keylines, running down the
// seam line from the waist to the hem. The centre is blue except on the blue leg, where it inverts
// to black; the keyline reads white against black and blue legs and black against light ones.
const legs = (body: string, keyline: string, center: string): CompletePantsSpec => ({
  body,
  stripes: {
    position: 'center',
    bands: [{ color: center, size: 'm' }],
    gap: 'none',
    edge: keyline,
  },
  marks: [],
});

export const PANTHERS_SPEC: TeamSpec = {
  helmets: {
    // The panther mark on a black shell with a black cage.
    black: { shell: 'black', facemask: 'black', decal: PANTHERS_HELMET_DECAL, number: 'none' },
    // The same mark on a silver shell, black cage.
    silver: { shell: 'silver', facemask: 'black', decal: PANTHERS_HELMET_DECAL, number: 'none' },
  },
  jerseys: {
    blue: PANTHERS_JERSEY_BLUE,
    white: PANTHERS_JERSEY_WHITE,
    black: PANTHERS_JERSEY_BLACK,
  },
  pants: {
    black: legs('black', 'white', 'blue'),
    blue: legs('blue', 'white', 'black'),
    white: legs('white', 'black', 'blue'),
    silver: legs('silver', 'black', 'blue'),
  },
  socks: {
    black: { color: 'black', stripes: 'none' },
    blue: { color: 'blue', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
  },
};
