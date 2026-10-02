// Los Angeles as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// The primary kits and the gold alternate share a white shell; the navy alternate has its own.
// Every jersey carries bolts on the sleeves and none on the collar.
//
// The pants are plain on purpose. Los Angeles wears a bolt down each leg, but on the side seam,
// which a front-on mannequin cannot show; drawing it onto the leg's face would put a mark where
// the real pant has none.
import type { TeamSpec } from '../core/team-spec';
import { chargersHelmetDecal } from './marks/construction';
import { CHARGERS_JERSEY_GOLD } from './jerseys/gold';
import { CHARGERS_JERSEY_NAVY } from './jerseys/navy';
import { CHARGERS_JERSEY_POWDER } from './jerseys/powder';
import { CHARGERS_JERSEY_WHITE } from './jerseys/white';

// Jersey hexes from the curated rows. Powder blue and gold are the physical body colours.
export const CHARGERS_PALETTE = {
  powderBlue: '#0080C6',
  gold: '#FFC20E',
  white: '#FFFFFF',
  navy: '#002244',
};

const plainPants = (body: string) => ({ body, stripes: 'none' as const, marks: [] });
const plainSocks = (color: string) => ({ color, stripes: 'none' as const });

export const CHARGERS_SPEC: TeamSpec = {
  helmets: {
    // The white shell: a gold bolt in a powder-blue keyline, a powder-blue numeral, a gold cage.
    white: {
      shell: 'white',
      facemask: 'gold',
      decal: chargersHelmetDecal('powderBlue', 'gold'),
      number: { fill: 'powderBlue' },
    },
    // The navy shell: a white bolt in a gold keyline, a white numeral, a navy cage.
    navy: {
      shell: 'navy',
      facemask: 'navy',
      decal: chargersHelmetDecal('gold', 'white'),
      number: { fill: 'white' },
    },
  },
  jerseys: {
    powder: CHARGERS_JERSEY_POWDER,
    white: CHARGERS_JERSEY_WHITE,
    gold: CHARGERS_JERSEY_GOLD,
    navy: CHARGERS_JERSEY_NAVY,
  },
  pants: {
    gold: plainPants('gold'),
    white: plainPants('white'),
    powder: plainPants('powderBlue'),
    navy: plainPants('navy'),
  },
  socks: {
    powder: plainSocks('powderBlue'),
    white: plainSocks('white'),
    gold: plainSocks('gold'),
    navy: plainSocks('navy'),
  },
};
