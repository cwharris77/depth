// Miami as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks. The kits are not one construction: home and away carry no sleeve
// trim, the throwback carries a five-band sleeve set and a teal crown stripe, and Rivalries
// carries a teal wedge with an orange slash plus an orange collar V.
import type { TeamSpec } from '../core/team-spec';
import { DOLPHINS_SUNBURST_DECAL, DOLPHINS_THROWBACK_DECAL } from './marks/construction';
import { DOLPHINS_JERSEY_1972 } from './jerseys/1972';
import { DOLPHINS_JERSEY_NAVY } from './jerseys/navy';
import { DOLPHINS_JERSEY_TEAL } from './jerseys/teal';
import { DOLPHINS_JERSEY_WHITE } from './jerseys/white';

export const DOLPHINS_PALETTE = {
  teal: '#008E97',
  orange: '#FC4C02',
  white: '#FFFFFF',
  navy: '#101820',
};

export const DOLPHINS_SPEC: TeamSpec = {
  helmets: {
    // White shell and cage, orange crown stripe and sunburst.
    white: {
      shell: 'white',
      facemask: 'white',
      decal: DOLPHINS_SUNBURST_DECAL,
      number: 'none',
    },
    // Navy shell and cage under the same orange stripe and sunburst.
    navy: {
      shell: 'navy',
      facemask: 'navy',
      decal: DOLPHINS_SUNBURST_DECAL,
      number: 'none',
    },
    // White shell and cage, teal crown stripe and the broken-ring dolphin.
    white1972: {
      shell: 'white',
      facemask: 'white',
      decal: DOLPHINS_THROWBACK_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    teal: DOLPHINS_JERSEY_TEAL,
    white: DOLPHINS_JERSEY_WHITE,
    navy: DOLPHINS_JERSEY_NAVY,
    '1972': DOLPHINS_JERSEY_1972,
  },
  pants: {
    // A teal stripe piped in orange down the side seam.
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [{ color: 'teal', size: 'l' }],
        gap: 'none',
        edge: 'orange',
      },
      marks: [],
    },
    // A white stripe piped in orange on the teal pants.
    teal: {
      body: 'teal',
      stripes: {
        position: 'leg-edge',
        bands: [{ color: 'white', size: 'l' }],
        gap: 'none',
        edge: 'orange',
      },
      marks: [],
    },
    navy: { body: 'navy', stripes: 'none', marks: [] },
    // Teal, orange, teal side-seam stripe of the throwback.
    white1972: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'teal', size: 's' },
          { color: 'orange', size: 's' },
          { color: 'teal', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    teal: { color: 'teal', stripes: 'none' },
  },
};
