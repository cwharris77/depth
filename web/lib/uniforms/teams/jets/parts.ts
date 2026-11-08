// New York as a complete team spec: every helmet, jersey, pants and socks part, with the helmet
// wordmark drawn by the marks in ./marks.
//
// Four helmets (the green and black shells, the white shell with a green centre stripe, and the
// rivalries black shell with an iron-ore wordmark and stripe), four jerseys, and pants with a single
// broad side stripe.
import type { CompletePantsSpec, CompleteSocksSpec } from '../core/complete';
import type { TeamSpec } from '../core/team-spec';
import {
  JETS_WORDMARK_GREEN_KEYLINED,
  JETS_WORDMARK_WHITE,
  jetsStripedWordmark,
} from './marks/construction';
import { JETS_JERSEY_BLACK } from './jerseys/black';
import { JETS_JERSEY_GREEN } from './jerseys/green';
import { JETS_JERSEY_RIV } from './jerseys/riv';
import { JETS_JERSEY_WHITE } from './jerseys/white';

export const JETS_PALETTE = {
  green: '#125740',
  black: '#000000',
  white: '#FFFFFF',
  // Flat approximations of the rivalries set's filtered green, Light Iron Ore and Dark Stucco.
  gothamGreen: '#454A3E',
  ironOre: '#B4B8B0',
  darkStucco: '#5E625A',
};

// One broad stripe down the side seam.
const pants = (body: string, stripe: string): CompletePantsSpec => ({
  body,
  stripes: {
    position: 'leg-edge',
    bands: [{ color: stripe, size: 'l' }],
    gap: 'none',
    edge: 'none',
  },
  marks: [],
});
const socks = (color: string): CompleteSocksSpec => ({ color, stripes: 'none' });

export const JETS_SPEC: TeamSpec = {
  helmets: {
    // Home/away's green shell with a white cage.
    green: { shell: 'green', facemask: 'white', decal: JETS_WORDMARK_WHITE, number: 'none' },
    // The white shell and cage, with the wordmark and a centre stripe in green.
    white: {
      shell: 'white',
      facemask: 'white',
      decal: jetsStripedWordmark('green', 'green'),
      number: 'none',
    },
    // Black shell with a white-keylined green wordmark and a green cage.
    black: {
      shell: 'black',
      facemask: 'green',
      decal: JETS_WORDMARK_GREEN_KEYLINED,
      number: 'none',
    },
    // Rivalries' black shell and cage with an iron-ore wordmark over a dark centre stripe.
    'riv-black': {
      shell: 'black',
      facemask: 'black',
      decal: jetsStripedWordmark('ironOre', 'darkStucco'),
      number: 'none',
    },
  },
  jerseys: {
    green: JETS_JERSEY_GREEN,
    white: JETS_JERSEY_WHITE,
    riv: JETS_JERSEY_RIV,
    black: JETS_JERSEY_BLACK,
  },
  pants: {
    green: pants('green', 'white'),
    white: pants('white', 'green'),
    black: pants('black', 'green'),
    // Black and iron-ore bands, black outermost.
    riv: {
      body: 'gothamGreen',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'black', size: 's' },
          { color: 'ironOre', size: 's' },
          { color: 'black', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    green: socks('green'),
    white: socks('white'),
    black: socks('black'),
  },
};
