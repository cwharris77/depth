// New England as a complete team spec: every helmet, jersey, pants and socks part, with the helmet
// mark and the diagonal shoulder bands drawn by the marks in ./marks.
import type { CompletePantsSpec } from '../core/complete';
import type { TeamSpec } from '../core/team-spec';
import { PATRIOTS_HELMET_DECAL } from './marks/construction';
import { PATRIOTS_JERSEY_NAVY } from './jerseys/navy';
import { PATRIOTS_JERSEY_PAT } from './jerseys/pat';
import { PATRIOTS_JERSEY_RIVALRIES } from './jerseys/rivalries';
import { PATRIOTS_JERSEY_WHITE } from './jerseys/white';

// Two navies and two reds are in play: navy and red on the modern kits, rivalNavy and patRed on the
// royal and throwback ones.
export const PATRIOTS_PALETTE = {
  navy: '#002244',
  rivalNavy: '#002F6C',
  red: '#C60C30',
  patRed: '#C8102E',
  silver: '#B0B7BC',
  white: '#FFFFFF',
};

// Unbroken legs: each takes its body colour and carries no stripe.
const legs = (body: string): CompletePantsSpec => ({ body, stripes: 'none', marks: [] });

export const PATRIOTS_SPEC: TeamSpec = {
  helmets: {
    // The modern mark on a navy shell with a red cage.
    navy: { shell: 'navy', facemask: 'red', decal: PATRIOTS_HELMET_DECAL, number: 'none' },
    // The same mark and cage on a silver shell.
    silver: { shell: 'silver', facemask: 'red', decal: PATRIOTS_HELMET_DECAL, number: 'none' },
    // The throwback white shell with a white cage and no mark.
    pat: { shell: 'white', facemask: 'white', decal: 'none', number: 'none' },
    // The modern mark on a white shell with a silver cage.
    rivalries: {
      shell: 'white',
      facemask: 'silver',
      decal: PATRIOTS_HELMET_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    navy: PATRIOTS_JERSEY_NAVY,
    white: PATRIOTS_JERSEY_WHITE,
    pat: PATRIOTS_JERSEY_PAT,
    rivalries: PATRIOTS_JERSEY_RIVALRIES,
  },
  pants: {
    navy: legs('navy'),
    white: legs('white'),
    silver: legs('silver'),
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
    // White hoops of red, blue and red around the calf.
    hoops: {
      color: 'white',
      stripes: {
        bands: [
          { color: 'patRed', size: 's' },
          { color: 'rivalNavy', size: 's' },
          { color: 'patRed', size: 's' },
        ],
        gap: 'narrow',
        edge: 'none',
      },
    },
    royal: { color: 'rivalNavy', stripes: 'none' },
  },
};
