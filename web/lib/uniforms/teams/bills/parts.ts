// Buffalo as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// The two modern kits (home, away) share the same white shell with the navy buffalo and red
// diagonal stripe. The Rivalries kit is the genuinely different one: a tone-on-tone ice-silver
// helmet treatment. Body and pants are royal at home, white at away; the Rivalries body is white.
import type { TeamSpec } from '../core/team-spec';
import { BILLS_BUFFALO_DECAL, BILLS_ICE_DECAL } from './marks/construction';
import { BILLS_JERSEY_BLUE } from './jerseys/blue';
import { BILLS_JERSEY_RIVALRIES } from './jerseys/rivalries';
import { BILLS_JERSEY_WHITE } from './jerseys/white';

export const BILLS_PALETTE = {
  navy: '#00338D',
  red: '#C60C30',
  white: '#ffffff',
  iceSilver: '#9CA0A4',
  iceSilverLight: '#D6D8DA',
  rivalriesNumber: '#A9ADB1',
};

export const BILLS_SPEC: TeamSpec = {
  helmets: {
    // The white shell with the navy buffalo and red diagonal stripe, with a white cage.
    white: { shell: 'white', facemask: 'white', decal: BILLS_BUFFALO_DECAL, number: 'none' },
    // Rivalries' shell stays white; only the decal treatment is silver. Same white cage.
    ice: { shell: 'white', facemask: 'white', decal: BILLS_ICE_DECAL, number: 'none' },
  },
  jerseys: {
    blue: BILLS_JERSEY_BLUE,
    white: BILLS_JERSEY_WHITE,
    rivalries: BILLS_JERSEY_RIVALRIES,
  },
  pants: {
    // A single red stripe down the leg seam, stopping at the hem.
    blue: {
      body: 'navy',
      stripes: {
        position: 'center',
        bands: [{ color: 'red', size: 'm' }],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    white: {
      body: 'white',
      stripes: {
        position: 'center',
        bands: [{ color: 'red', size: 'm' }],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    // Rivalries pants, white, unbanded.
    rivalries: { body: 'white', stripes: 'none', marks: [] },
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
  },
};
