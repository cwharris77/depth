// Washington authored as composable parts. Geometry is imported unchanged from commanders.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// One construction: a broad band at the sleeve cap split by a thinner line through its middle. No
// collar trim, no helmet stripe, no pant stripe. The three kits combine one helmet (the burgundy
// shell), two jerseys (burgundy shared by home + 70s-burgundy, white for away), and two pants
// (burgundy for home/70s, white for away).
//
// NOTE: home and 70s-burgundy render IDENTICALLY by design — both store burgundy over gold,
// differing only in accent — and the reference draws one burgundy sleeve treatment. The spec flags
// this as a known pixel-identical pair to surface, not to silently collapse.

import {
  COMMANDERS_BOUNDS,
  COMMANDERS_DECAL_PATH,
  COMMANDERS_SLEEVE_X_LEFT,
  COMMANDERS_SLEEVE_X_RIGHT,
} from './commanders';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The broad cap band split by a thinner line through its middle.
function sleeveBand(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', COMMANDERS_SLEEVE_X_LEFT],
    ['sleeve-right', COMMANDERS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < COMMANDERS_BOUNDS.length - 1; i += 1) {
    const top = COMMANDERS_BOUNDS[i];
    const bottom = COMMANDERS_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `commanders-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? line : band,
      });
    }
  }
  return out;
}

// The gold "W" — one layer, four subpaths, no keyline. Gold is the mark's color on every kit; the
// jersey supplies which palette color that is.
function decal(which: string): PartLayer[] {
  return [
    {
      id: 'commanders-decal',
      surface: 'helmet',
      d: COMMANDERS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: which,
    },
  ];
}

// The burgundy shell with the gold "W" — one object, shared by all three kits.
//
// White cage. The burgundy Commanders shell wears a white facemask (named sources; the white cage
// reads cleanly against the burgundy shell).
const HELMET_BURGUNDY: UniformPart = {
  base: 'burgundy',
  facemask: 'white',
  layers: decal('gold'),
};

// Burgundy jersey (home + 70s-burgundy): burgundy body, gold band around a white line, gold
// numerals keylined white.
const JERSEY_BURGUNDY: UniformPart = {
  base: 'burgundy',
  layers: sleeveBand('gold', 'white'),
  number: { fill: 'gold', outline: 'white', outlineWidth: 14 },
};

// Away jersey: white body, burgundy band around a gold line, burgundy numerals keylined gold.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveBand('burgundy', 'gold'),
  number: { fill: 'burgundy', outline: 'gold', outlineWidth: 14 },
};

// Burgundy pants (home + 70s-burgundy).
const PANTS_BURGUNDY: UniformPart = { base: 'burgundy', layers: [] };

// White pants (away).
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const COMMANDERS_PARTS: TeamPartsDefinition = {
  teamId: 'commanders',
  // Jersey hexes from the curated rows (teamcolorcodes). Burgundy and gold are the physical body/
  // trim colors; white is the band-line/number-literal that only the home row lacks as a token.
  palette: {
    burgundy: '#5A1414',
    gold: '#FFB612',
    white: '#FFFFFF',
  },
  helmets: { burgundy: HELMET_BURGUNDY },
  jerseys: {
    burgundy: JERSEY_BURGUNDY,
    white: JERSEY_WHITE,
  },
  pants: { burgundy: PANTS_BURGUNDY, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'burgundy', jersey: 'burgundy', pants: 'burgundy' },
    away: { helmet: 'burgundy', jersey: 'white', pants: 'white' },
    '70s-burgundy': { helmet: 'burgundy', jersey: 'burgundy', pants: 'burgundy' },
  },
};

export const COMMANDERS_UNIFORMS_FROM_PARTS = compileParts(COMMANDERS_PARTS);
