import { RAMS_JERSEY_ROYAL_2026, RAMS_JERSEY_WHITE_2026 } from './jerseys/primary-2026';
import { RAMS_JERSEY_CLASSIC_SOL, RAMS_JERSEY_FEARSOME_WHITE } from './jerseys/alternates-2026';
// Los Angeles as a complete team spec: every helmet, jersey, pants and socks part. The 2020
// jerseys carry a capped-sleeve horn, while Midnight Mode shows a tapered front horn and blue sleeve.
// Every kit shares the shell horn and a keylined stripe on each pant leg.
//
// The gold and yellow paint slots share the same Sol approximation across the equipment and jersey.
import type { TeamSpec } from '../core/team-spec';
import { ramsHelmetHorn, ramsLegStripe } from './marks/construction';
import { RAMS_JERSEY_BONE } from './jerseys/bone';
import { RAMS_JERSEY_RIVALRIES } from './jerseys/rivalries';
import { RAMS_JERSEY_ROYAL } from './jerseys/royal';
import { RAMS_JERSEY_WHITE } from './jerseys/white';

export const RAMS_PALETTE = {
  royal: '#003594',
  gold: '#FFD100',
  navy: '#0D1B3E',
  yellow: '#FFD100',
  bone: '#F0EBE0',
  white: '#FFFFFF',
};

export const RAMS_SPEC: TeamSpec = {
  helmets: {
    'royal-2026': {
      shell: 'royal',
      facemask: 'royal',
      decal: ramsHelmetHorn('yellow'),
      number: 'none',
    },
    // The royal shell with a white horn and a white cage, worn with Fearsome White.
    'royal-white-horn': {
      shell: 'royal',
      facemask: 'white',
      decal: ramsHelmetHorn('white'),
      number: 'none',
    },
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
    'royal-2026': RAMS_JERSEY_ROYAL_2026,
    'white-2026': RAMS_JERSEY_WHITE_2026,
    'classic-sol': RAMS_JERSEY_CLASSIC_SOL,
    'fearsome-white': RAMS_JERSEY_FEARSOME_WHITE,
    royal: RAMS_JERSEY_ROYAL,
    white: RAMS_JERSEY_WHITE,
    bone: RAMS_JERSEY_BONE,
    rivalries: RAMS_JERSEY_RIVALRIES,
  },
  // Every leg carries the keylined stripe: an outer keyline with an inboard band, ending at the hem. Royal legs carry
  // a single white stripe, so keyline and band take the same colour.
  pants: {
    'sol-2026': {
      body: 'yellow',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('white', 'royal') }],
    },
    'white-2026': {
      body: 'white',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('yellow', 'royal') }],
    },
    // Classic Sol's royal, Sol and royal triple stripe down the side of the leg.
    'classic-sol': {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'royal', size: 's' },
          { color: 'yellow', size: 's' },
          { color: 'royal', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    'fearsome-white': {
      body: 'white',
      stripes: 'none',
      marks: [{ paint: 'over', mark: ramsLegStripe('navy', 'royal') }],
    },
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
    white: { color: 'white', stripes: 'none' },
    royal: { color: 'royal', stripes: 'none' },
    bone: { color: 'bone', stripes: 'none' },
    navy: { color: 'navy', stripes: 'none' },
  },
};
