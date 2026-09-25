// Denver as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { BRONCOS_CRUSH_DECAL, BRONCOS_HORSE_DECAL } from './marks/construction';
import { BRONCOS_JERSEY_CRUSH } from './jerseys/crush';
import { BRONCOS_JERSEY_ORANGE } from './jerseys/orange';
import { BRONCOS_JERSEY_WHITE } from './jerseys/white';

// Navy, orange and white are the modern bodies; royal and crushOrange are Orange Crush's colours.
export const BRONCOS_PALETTE = {
  navy: '#002244',
  orange: '#FB4F14',
  white: '#FFFFFF',
  royal: '#001489',
  crushOrange: '#FA4616',
  // Darker shades of the modern bodies for the neck opening inside the V, so it reads without an
  // outline.
  orangeNeck: '#D9420F',
  whiteNeck: '#ECEEEF',
};

// The modern pants' stripes run down the outer side seam only, so the front view shows plain legs.
const plainPants = (body: string) => ({ body, stripes: 'none' as const, marks: [] });
const plainSocks = (color: string) => ({ color, stripes: 'none' as const });

export const BRONCOS_SPEC: TeamSpec = {
  helmets: {
    // The modern shell, on every modern kit, with a navy cage.
    'navy-horse': {
      shell: 'navy',
      facemask: 'navy',
      decal: BRONCOS_HORSE_DECAL,
      number: 'none',
    },
    'royal-d': { shell: 'royal', facemask: 'white', decal: BRONCOS_CRUSH_DECAL, number: 'none' },
  },
  jerseys: {
    orange: BRONCOS_JERSEY_ORANGE,
    white: BRONCOS_JERSEY_WHITE,
    crush: BRONCOS_JERSEY_CRUSH,
  },
  pants: {
    orange: plainPants('orange'),
    white: plainPants('white'),
    navy: plainPants('navy'),
  },
  socks: {
    white: plainSocks('white'),
    navy: plainSocks('navy'),
    orange: plainSocks('orange'),
    // Royal above alternating orange and royal hoops, split by white.
    crush: {
      color: 'white',
      stripes: {
        bands: [
          { color: 'royal', size: 'l' },
          { color: 'crushOrange', size: 's' },
          { color: 'royal', size: 's' },
          { color: 'crushOrange', size: 's' },
          { color: 'royal', size: 's' },
          { color: 'crushOrange', size: 's' },
          { color: 'royal', size: 's' },
        ],
        gap: 'narrow',
        edge: 'none',
      },
    },
  },
};
