// New York authored as composable parts. Geometry is imported unchanged from giants.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The three kits do not share one construction: the royal home jersey has NO sleeve stripes, the
// white away jersey carries a thin/thick/thin red set, and the 1980s throwback carries a
// red/white/red set at the cuff plus the only collar trim. What IS shared: home and away wear the
// SAME blue shell with the white monogram, and all three wear white pants. The throwback's shell
// is bare (a GIANTS wordmark that is out of scope, not a borrowed monogram) — so it is the second
// helmet part, same blue, different layers.

import {
  GIANTS_AWAY_SLEEVE_X_LEFT,
  GIANTS_AWAY_SLEEVE_X_RIGHT,
  GIANTS_AWAY_STRIPE_BANDS,
  GIANTS_COLLAR_CORE_WIDTH,
  GIANTS_COLLAR_OUTER_WIDTH,
  GIANTS_DECAL_MONOGRAM_PATH,
  GIANTS_THROWBACK_SLEEVE_X_LEFT,
  GIANTS_THROWBACK_SLEEVE_X_RIGHT,
  GIANTS_THROWBACK_STRIPE_BANDS,
} from './giants';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';

function sleeveStripes(
  bands: [number, number][],
  xLeft: number[],
  xRight: number[],
  fills: string[]
): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', xLeft],
    ['sleeve-right', xRight],
  ];
  bands.forEach(([top, bottom], i) => {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `giants-sleeve-stripe-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: fills[i],
      });
    }
  });
  return out;
}

// The blue shell with the white monogram — one object, shared by home and away.
//
// Grey cage. The modern metallic-blue shell carries a grey facemask (named sources; the GUD
// composite reads the bars at ~#9a9a9a against the blue shell). The shared neutral #4b5158 it
// replaces is a noticeably darker grey.
const HELMET_BLUE_MONOGRAM: UniformPart = {
  base: 'royal',
  facemask: 'cageGrey',
  layers: [
    {
      id: 'giants-decal-monogram',
      surface: 'helmet',
      d: GIANTS_DECAL_MONOGRAM_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ],
};

// The throwback's bare blue shell — the wordmark is out of scope, so it keeps the shell color and
// nothing else (this is the second helmet part: same shell, no monogram).
//
// White cage. The 1980-1999 era (restored as the Legacy look) wore a navy shell with a WHITE
// facemask (giantswire: "navy with a white facemask"; pocketprohelmets notes the 1975 switch from
// grey to white). GUD cannot cleanly separate a white cage from the surrounding blues, so the
// named sources are the source of truth here.
const HELMET_BLUE_BARE: UniformPart = { base: 'royal', facemask: 'white', layers: [] };

// Home jersey: royal body, no sleeve stripes, white numerals.
const JERSEY_ROYAL: UniformPart = {
  base: 'royal',
  layers: [],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away jersey: white body, thin/thick/thin red sleeve stripes, red numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes(
    GIANTS_AWAY_STRIPE_BANDS,
    GIANTS_AWAY_SLEEVE_X_LEFT,
    GIANTS_AWAY_SLEEVE_X_RIGHT,
    ['red', 'red', 'red']
  ),
  number: { fill: 'red', outline: 'red', outlineWidth: 10 },
};

// The 1980s throwback jersey: royal body, red/white/red cuff stripes, a red-over-white collar,
// white numerals keylined red.
const JERSEY_THROWBACK: UniformPart = {
  base: 'royal',
  layers: [
    ...sleeveStripes(
      GIANTS_THROWBACK_STRIPE_BANDS,
      GIANTS_THROWBACK_SLEEVE_X_LEFT,
      GIANTS_THROWBACK_SLEEVE_X_RIGHT,
      ['red', 'white', 'red']
    ),
    {
      id: 'giants-collar-outer',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'red',
      strokeWidth: GIANTS_COLLAR_OUTER_WIDTH,
    },
    {
      id: 'giants-collar-core',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: GIANTS_COLLAR_CORE_WIDTH,
    },
  ],
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};

// Plain white pants, shared by every kit.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const GIANTS_PARTS: TeamPartsDefinition = {
  teamId: 'giants',
  // Jersey hexes from the curated rows (teamcolorcodes). Royal and red are physical fixed colors
  // that the three rows carry across different primary/secondary/accent slots (royal is home and
  // throwback primary, away secondary; red is home and away accent, throwback secondary).
  palette: {
    royal: '#0B2265',
    // White is a literal on home and the throwback (no white token on those rows); the away row
    // carries it as primary.
    white: '#FFFFFF',
    red: '#A71930',
    // The modern shell's cage grey — no token in the blue/red/white Giants palette. Sampled from
    // the GUD composite (see the helmet note); matches the documented grey facemask.
    cageGrey: '#9A9A9A',
  },
  helmets: { 'blue-monogram': HELMET_BLUE_MONOGRAM, 'blue-bare': HELMET_BLUE_BARE },
  jerseys: {
    royal: JERSEY_ROYAL,
    white: JERSEY_WHITE,
    throwback: JERSEY_THROWBACK,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'blue-monogram', jersey: 'royal', pants: 'white' },
    away: { helmet: 'blue-monogram', jersey: 'white', pants: 'white' },
    '1980s-throwback': { helmet: 'blue-bare', jersey: 'throwback', pants: 'white' },
  },
};

export const GIANTS_UNIFORMS_FROM_PARTS = compileParts(GIANTS_PARTS);
