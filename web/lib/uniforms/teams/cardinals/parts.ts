// Arizona as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// Arizona's construction is unusually spare: no helmet stripe, no shoulder yoke, and a collar cut
// in the body colour. The four kits differ in the shell (white for home and away, black for the
// black alternate, cream for Rivalries) and the body and sleeve treatment: home is a solid
// cardinal body with white shoulder numerals, away and the black alternate carry two horizontal
// sleeve bands, and Rivalries is a speckled cream body with sleeve patches.
import type { TeamSpec } from '../core/team-spec';
import {
  CARDINALS_DECAL_GOLD,
  CARDINALS_DECAL_RED,
  CARDINALS_EGGSHELL_DECAL_CREAM,
  CARDINALS_EGGSHELL_DECAL_ORANGE,
  CARDINALS_EGGSHELL_DECAL_RED,
  CARDINALS_EGGSHELL_DECAL_WHITE,
} from './marks/decals';
import { CARDINALS_EGGSHELL_HELMET_DECAL, CARDINALS_HELMET_DECAL } from './marks/helmet';
import { CARDINALS_NUMBER_KEYLINE } from './marks/source';
import { CARDINALS_JERSEY_BLACK } from './jerseys/black';
import { CARDINALS_JERSEY_RED } from './jerseys/red';
import { CARDINALS_JERSEY_RIVALRIES } from './jerseys/rivalries';
import { CARDINALS_JERSEY_WHITE } from './jerseys/white';

// Cardinal, black and white are the physical body colours; cream and the rival red and orange are
// the Rivalries kit's own palette; the decal colours and the numeral keyline are fixed art colours.
export const CARDINALS_PALETTE = {
  red: '#A01523',
  cardinal: '#A01523',
  black: '#000000',
  white: '#FFFFFF',
  cream: '#FBF1DD',
  rivalRed: '#B31529',
  rivalOrange: '#EE6B3D',
  decalRed: CARDINALS_DECAL_RED,
  decalGold: CARDINALS_DECAL_GOLD,
  eggshellDecalRed: CARDINALS_EGGSHELL_DECAL_RED,
  eggshellDecalCream: CARDINALS_EGGSHELL_DECAL_CREAM,
  eggshellDecalOrange: CARDINALS_EGGSHELL_DECAL_ORANGE,
  eggshellDecalWhite: CARDINALS_EGGSHELL_DECAL_WHITE,
  numberKeyline: CARDINALS_NUMBER_KEYLINE,
  // Fine fabric flecks and stitching.
  speckle: '#B8A58A',
  stitch: '#99958D',
};

// Two thin cardinal lines around a white centre line, worn on the white and black pants.
const linedPants = (body: string) => ({
  body,
  stripes: {
    position: 'leg-edge' as const,
    bands: [
      { color: 'cardinal', size: 's' as const },
      { color: 'white', size: 's' as const },
      { color: 'cardinal', size: 's' as const },
    ],
    gap: 'none' as const,
    edge: 'none' as const,
  },
  marks: [],
});

const plainSocks = (color: string) => ({ color, stripes: 'none' as const });

export const CARDINALS_SPEC: TeamSpec = {
  helmets: {
    // White cage on the white shell, matching it.
    white: {
      shell: 'white',
      facemask: 'white',
      decal: CARDINALS_HELMET_DECAL,
      number: 'none',
    },
    // Black cage on the black shell.
    black: {
      shell: 'black',
      facemask: 'black',
      decal: CARDINALS_HELMET_DECAL,
      number: 'none',
    },
    // The Rivalries shell carries a red cage.
    cream: {
      shell: 'cream',
      facemask: 'rivalRed',
      decal: CARDINALS_EGGSHELL_HELMET_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    red: CARDINALS_JERSEY_RED,
    white: CARDINALS_JERSEY_WHITE,
    black: CARDINALS_JERSEY_BLACK,
    rivalries: CARDINALS_JERSEY_RIVALRIES,
  },
  pants: {
    // Home pants are unbroken.
    red: { body: 'red', stripes: 'none', marks: [] },
    white: linedPants('white'),
    black: linedPants('black'),
    // An orange line outside a wide red one.
    cream: {
      body: 'cream',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'rivalOrange', size: 's' },
          { color: 'rivalRed', size: 'm' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    red: plainSocks('red'),
    white: plainSocks('white'),
    black: plainSocks('black'),
    rivalries: plainSocks('rivalRed'),
  },
};
