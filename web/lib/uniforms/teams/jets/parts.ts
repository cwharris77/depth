// New York as a complete team spec: every helmet, jersey, pants and socks part, with the helmet
// wordmark drawn by the marks in ./marks.
//
// Three helmets (home/away's #125740 green, rivalries' #115740 green, black-alt's black — the two
// greens differ by a step), four jerseys and four pants/socks pairs. No helmet stripe, no pant
// stripe.
import type { CompletePantsSpec, CompleteSocksSpec } from '../core/complete';
import type { TeamSpec } from '../core/team-spec';
import { JETS_WORDMARK_GREEN, JETS_WORDMARK_WHITE } from './marks/construction';
import { JETS_JERSEY_BLACK } from './jerseys/black';
import { JETS_JERSEY_GREEN } from './jerseys/green';
import { JETS_JERSEY_RIV } from './jerseys/riv';
import { JETS_JERSEY_WHITE } from './jerseys/white';

export const JETS_PALETTE = {
  green: '#125740',
  rivalGreen: '#115740',
  black: '#000000',
  white: '#FFFFFF',
};

// Plain pants in one colour: no stripe, no mark.
const pants = (body: string): CompletePantsSpec => ({ body, stripes: 'none', marks: [] });
const socks = (color: string): CompleteSocksSpec => ({ color, stripes: 'none' });

export const JETS_SPEC: TeamSpec = {
  helmets: {
    // Home/away's green shell with a white cage.
    green: { shell: 'green', facemask: 'white', decal: JETS_WORDMARK_WHITE, number: 'none' },
    // Rivalries' green shell, a step off the home green.
    'riv-green': {
      shell: 'rivalGreen',
      facemask: 'white',
      decal: JETS_WORDMARK_WHITE,
      number: 'none',
    },
    // Black shell with a green wordmark and a green cage.
    black: { shell: 'black', facemask: 'green', decal: JETS_WORDMARK_GREEN, number: 'none' },
  },
  jerseys: {
    green: JETS_JERSEY_GREEN,
    white: JETS_JERSEY_WHITE,
    riv: JETS_JERSEY_RIV,
    black: JETS_JERSEY_BLACK,
  },
  pants: {
    green: pants('green'),
    white: pants('white'),
    riv: pants('rivalGreen'),
    black: pants('black'),
  },
  socks: {
    green: socks('green'),
    white: socks('white'),
    riv: socks('rivalGreen'),
    black: socks('black'),
  },
};
