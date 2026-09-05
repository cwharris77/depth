// Cleveland authored as composable parts. Geometry is imported unchanged from browns.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// Cleveland's construction is defined by what it does NOT have: the shell carries no logo and no
// center stripe, the white pants carry no stripe, the V-collar carries no trim, and the numerals
// carry no keyline. Everything the uniform says, it says with one five-band stripe stack at the
// end of each sleeve. The three kits combine two helmets (the bare orange shell home/away, and
// the 1946 throwback's brown shell) and one shared white jersey — away and the 1946 both wear a
// white body with the stack banded brown-over-orange — plus one pair of white pants for all three.

import { BROWNS_SLEEVE_X_LEFT, BROWNS_SLEEVE_X_RIGHT, BROWNS_STRIPE_BOUNDS } from './browns';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// The five-band stripe stack over the end of each sleeve. One construction, three colorways; the
// codex calls the outer/middle/inner bands and the two between them.
function sleeveStripes(band: string, gap: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', BROWNS_SLEEVE_X_LEFT],
    ['sleeve-right', BROWNS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < BROWNS_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = BROWNS_STRIPE_BOUNDS[i];
    const bottom = BROWNS_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `browns-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? band : gap,
      });
    }
  }
  return out;
}

// The bare orange shell — the club is the only one in the league with a bare helmet — shared by
// home and away.
//
// White cage. The bare orange shell wears the SF2BD-SW-SP white mask (named sources). The white
// cage reads cleanly against the orange shell.
const HELMET_ORANGE: UniformPart = {
  base: 'orange',
  facemask: 'white',
  layers: [],
};

// The 1946 throwback's brown shell (the era's documented leather helmet), inferred — NOT in the
// 2025 composite, provisional (see browns.ts).
//
// White cage. The modern reproduction of the 1946 shell wears the same SF2BD-SW-SP white mask.
const HELMET_BROWN: UniformPart = {
  base: 'brown',
  facemask: 'white',
  layers: [],
};

// Home jersey: brown body, white-over-orange stripe stack, plain white numerals (no keyline).
const JERSEY_BROWN: UniformPart = {
  base: 'brown',
  layers: sleeveStripes('white', 'orange'),
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};

// Away + 1946 jersey: white body, brown-over-orange stripe stack, plain brown numerals.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes('brown', 'orange'),
  number: { fill: 'brown', outline: 'brown', outlineWidth: 10 },
};

// Plain white pants — one pair shared by all three kits.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const BROWNS_PARTS: TeamPartsDefinition = {
  teamId: 'browns',
  // Jersey hexes from the curated rows (teamcolorcodes). Brown and orange are the two physical
  // colors carried in different primary/secondary/accent slots per row; white is the pants/numerals
  // literal (no white token on the home row).
  palette: {
    brown: '#311D00',
    orange: '#FF3C00',
    white: '#FFFFFF',
  },
  helmets: { orange: HELMET_ORANGE, brown: HELMET_BROWN },
  jerseys: {
    brown: JERSEY_BROWN,
    white: JERSEY_WHITE,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'orange', jersey: 'brown', pants: 'white' },
    away: { helmet: 'orange', jersey: 'white', pants: 'white' },
    '1946-throwback': { helmet: 'brown', jersey: 'white', pants: 'white' },
  },
};

export const BROWNS_UNIFORMS_FROM_PARTS = compileParts(BROWNS_PARTS);
