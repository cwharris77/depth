// New York authored as composable parts. Geometry is imported unchanged from jets.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// One construction throughout: two bands at the sleeve separated by a body-colored gap, and a deep
// V-collar that closes well below the generic chevron. No helmet stripe, no pant stripe. The white
// wordmark is on every shell the club wears, so it is pinned white.
//
// The kits combine three helmets (home/away's #125740 green, rivalries' #115740 green, black-alt's
// black — the two greens differ by a step) and four jerseys/pants; the two-green separation is
// real, per the measured table, not a re-derivation.

import {
  JETS_BAND_LOW,
  JETS_BAND_TOP,
  JETS_COLLAR_PATH,
  JETS_COLLAR_WIDTH,
  JETS_DECAL_PATH,
  JETS_SLEEVE_X_LEFT,
  JETS_SLEEVE_X_RIGHT,
} from './jets';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The two white sleeve bands, separated by a body-colored gap.
function sleeveBands(color: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', JETS_SLEEVE_X_LEFT],
    ['sleeve-right', JETS_SLEEVE_X_RIGHT],
  ];
  for (const [label, [top, bottom]] of [
    ['top', JETS_BAND_TOP],
    ['low', JETS_BAND_LOW],
  ] as [string, number[]][]) {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `jets-band-${label}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: color,
      });
    }
  }
  return out;
}

// The deep V-collar.
function collar(color: string): PartLayer[] {
  return [
    {
      id: 'jets-collar',
      surface: 'collar',
      d: JETS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: JETS_COLLAR_WIDTH,
    },
  ];
}

// The white wordmark — pinned, everywhere.
function wordmark(): PartLayer[] {
  return [
    {
      id: 'jets-decal',
      surface: 'helmet',
      d: JETS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ];
}

// Home/away's green shell (H1) — #125740, the current green.
const HELMET_GREEN: UniformPart = { base: 'green', facemask: 'white', layers: wordmark() };

// Rivalries' green shell (H2) — #115740, a distinct step.
const HELMET_RIV_GREEN: UniformPart = { base: 'rivalGreen', facemask: 'white', layers: wordmark() };

// Black-alt shell (H3).
const HELMET_BLACK: UniformPart = { base: 'black', facemask: 'white', layers: wordmark() };

// Home jersey (J1): green body, white bands + collar, white numerals.
const JERSEY_GREEN: UniformPart = {
  base: 'green',
  layers: [...sleeveBands('white'), ...collar('white')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey (J2): white body, green bands + collar, green numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBands('green'), ...collar('green')],
  number: { fill: 'green', outline: 'green', outlineWidth: 10 },
};

// Rivalries jersey (J3): rivalries-green body, black bands + collar, white numerals.
const JERSEY_RIV: UniformPart = {
  base: 'rivalGreen',
  layers: [...sleeveBands('black'), ...collar('black')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Black-alt jersey (J4): black body, green bands + collar, white numerals.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: [...sleeveBands('green'), ...collar('green')],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Pants — no pant stripe on any kit; each takes its body color.
const PANTS_GREEN: UniformPart = { base: 'green', layers: [] };
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
const PANTS_RIV: UniformPart = { base: 'rivalGreen', layers: [] };
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const JETS_PARTS: TeamPartsDefinition = {
  teamId: 'jets',
  // Jersey hexes from the curated rows (teamcolorcodes). The two greens differ by a step.
  palette: {
    green: '#125740',
    rivalGreen: '#115740',
    black: '#000000',
    white: '#FFFFFF',
  },
  helmets: { green: HELMET_GREEN, riv: HELMET_RIV_GREEN, black: HELMET_BLACK },
  jerseys: {
    green: JERSEY_GREEN,
    white: JERSEY_WHITE,
    riv: JERSEY_RIV,
    black: JERSEY_BLACK,
  },
  pants: { green: PANTS_GREEN, white: PANTS_WHITE, riv: PANTS_RIV, black: PANTS_BLACK },
  kits: {
    home: { helmet: 'green', jersey: 'green', pants: 'green' },
    away: { helmet: 'green', jersey: 'white', pants: 'white' },
    'rivalries-2025': { helmet: 'riv', jersey: 'riv', pants: 'riv' },
    'black-alt': { helmet: 'black', jersey: 'black', pants: 'black' },
  },
};

export const JETS_UNIFORMS_FROM_PARTS = compileParts(JETS_PARTS);
