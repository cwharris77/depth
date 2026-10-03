// Pittsburgh as a complete team spec: the black and gold shells, the three jerseys, the gold and
// khaki pants and the black and gold socks, with the hypocycloid decal, the sleeve stripe set and
// the 1934 panel drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { STEELERS_DECAL } from './marks/construction';
import { STEELERS_JERSEY_BLACK } from './jerseys/black';
import { STEELERS_JERSEY_BUMBLEBEE } from './jerseys/bumblebee';
import { STEELERS_JERSEY_WHITE } from './jerseys/white';

// Gold and black are the published team hexes; khaki is the 1934 throwback's pants. The decal
// colours are the mark's own and stay apart from the physical gold.
export const STEELERS_PALETTE = {
  gold: '#FFB612',
  black: '#101820',
  white: '#FFFFFF',
  khaki: '#D2C295',
  decalDisc: '#FDFDFD',
  decalRing: '#95ADB8',
  decalGold: '#FFC900',
  decalRed: '#DF1A20',
  decalBlue: '#013F85',
  decalSeparator: '#FEFEFE',
  decalWordmark: '#1E191C',
};

export const STEELERS_SPEC: TeamSpec = {
  helmets: {
    // The glossy black shell with a black cage, carrying the hypocycloid mark.
    black: { shell: 'black', facemask: 'black', decal: STEELERS_DECAL, number: 'none' },
    // The 1934 throwback's bare gold shell on the shared grey cage.
    gold: { shell: 'gold', facemask: 'neutral', decal: 'none', number: 'none' },
  },
  jerseys: {
    black: STEELERS_JERSEY_BLACK,
    white: STEELERS_JERSEY_WHITE,
    bumblebee: STEELERS_JERSEY_BUMBLEBEE,
  },
  pants: {
    // Gold with one broad black stripe down the outer edge of each leg, home and away.
    gold: {
      body: 'gold',
      stripes: {
        position: 'leg-edge',
        bands: [{ color: 'black', size: 'm' }],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // The throwback's khaki pants, unstriped.
    khaki: { body: 'khaki', stripes: 'none', marks: [] },
  },
  socks: {
    // Black socks under the gold pants.
    black: { color: 'black', stripes: 'none' },
    // Gold socks under the khaki pants.
    gold: { color: 'gold', stripes: 'none' },
  },
};
