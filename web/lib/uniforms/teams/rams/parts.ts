// Los Angeles as a complete team spec: every helmet, jersey, pants and socks part. All four kits
// share the construction: the horn on the shell, a widening band with a tail on each sleeve, and a
// keylined stripe on each pant leg. What changes between kits is which colours paint it, and on
// Rivalries the tail is royal against a yellow band rather than matching it.
//
// Two golds and two blues are real here and stay distinct: the modern gold #FFA300 and Rivalries'
// yellow #FFD100, the club royal #003594 and Rivalries' near-black navy #0D1B3E.
import type { TeamSpec } from '../core/team-spec';
import { ramsHelmetHorn, ramsLegStripe } from './marks/construction';
import { RAMS_JERSEY_BONE } from './jerseys/bone';
import { RAMS_JERSEY_RIVALRIES } from './jerseys/rivalries';
import { RAMS_JERSEY_ROYAL } from './jerseys/royal';
import { RAMS_JERSEY_WHITE } from './jerseys/white';

export const RAMS_PALETTE = {
  royal: '#003594',
  gold: '#FFA300',
  navy: '#0D1B3E',
  yellow: '#FFD100',
  bone: '#F0EBE0',
  white: '#FFFFFF',
};

export const RAMS_SPEC: TeamSpec = {
  helmets: {
    // The royal shell with the gold horn and a royal cage, worn with the royal, white and bone
    // jerseys.
    'royal-horn': {
      shell: 'royal',
      facemask: 'royal',
      decal: ramsHelmetHorn('gold'),
      number: 'none',
    },
    // The near-black navy shell with the yellow horn and a cage painted the shell colour.
    'navy-horn': {
      shell: 'navy',
      facemask: 'navy',
      decal: ramsHelmetHorn('yellow'),
      number: 'none',
    },
  },
  jerseys: {
    royal: RAMS_JERSEY_ROYAL,
    white: RAMS_JERSEY_WHITE,
    bone: RAMS_JERSEY_BONE,
    rivalries: RAMS_JERSEY_RIVALRIES,
  },
  // Every leg carries the keylined stripe: an outer keyline with an inboard band, ending at the hem. Royal legs carry
  // a single white stripe, so keyline and band take the same colour.
  pants: {
    gold: {
      body: 'gold',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('white', 'royal') }],
    },
    royal: {
      body: 'royal',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('white', 'white') }],
    },
    bone: {
      body: 'bone',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('gold', 'white') }],
    },
    navy: {
      body: 'navy',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('yellow', 'royal') }],
    },
  },
  socks: {
    royal: { color: 'royal', stripes: 'none' },
    bone: { color: 'bone', stripes: 'none' },
    navy: { color: 'navy', stripes: 'none' },
  },
};
