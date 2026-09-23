// Chicago authored as composable parts (spike). Geometry is imported unchanged from bears.ts —
// this file only restates WHICH parts each kit combines, and names the colors from a team
// palette instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: all three Chicago kits share one helmet (navy shell, the
// wishbone C keylined white) and one pair of pants (navy, orange-over-white stripe). Only the
// jersey actually changes. The flat form spelled all three out in full, so the decal and the
// pant stripe were authored three times each.

import {
  BEARS_DECAL_KEYLINE_PATH,
  BEARS_DECAL_LETTER_PATH,
  BEARS_PANTS_INNER_LEFT,
  BEARS_PANTS_INNER_RIGHT,
  BEARS_PANTS_OUTER_LEFT,
  BEARS_PANTS_OUTER_RIGHT,
  BEARS_SLEEVE_X_LEFT,
  BEARS_SLEEVE_X_RIGHT,
  BEARS_STRIPE_CORE_INSET,
  BEARS_STRIPE_GROUP_HEIGHT,
  BEARS_STRIPE_GROUP_TOPS,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

const BEARS_MODERN_COLLAR_PATH = 'M216,388 Q216,412 238,431 L294,478 L350,431 Q372,412 372,388';
const BEARS_CLASSIC_COLLAR_PATH = 'M229,388 Q229,405 246,414 L294,414 L342,414 Q359,405 359,388';

function sleeveStripes(edge: string, core: string): PartLayer[] {
  const out: PartLayer[] = [];
  BEARS_STRIPE_GROUP_TOPS.forEach((top, i) => {
    const bottom = top + BEARS_STRIPE_GROUP_HEIGHT;
    const coreTop = top + BEARS_STRIPE_CORE_INSET;
    const coreBottom = bottom - BEARS_STRIPE_CORE_INSET;
    const sides: [UniformSurface, number[]][] = [
      ['sleeve-left', BEARS_SLEEVE_X_LEFT],
      ['sleeve-right', BEARS_SLEEVE_X_RIGHT],
    ];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `bears-sleeve-edge-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: edge,
      });
      out.push({
        id: `bears-sleeve-core-${i}-${side}`,
        surface,
        d: `M${x0},${coreTop} H${x1} V${coreBottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: core,
      });
    }
  });
  return out;
}

function collar(outer: string, inner: string, path: string): PartLayer[] {
  return [
    { id: 'bears-collar-outer', stroke: outer, strokeWidth: 20 },
    { id: 'bears-collar-inner', stroke: inner, strokeWidth: 9 },
  ].map((s): PartLayer => ({
    ...s,
    surface: 'collar',
    d: path,
    clip: true,
    kind: 'stroke',
  }));
}

// One jersey shape, three colorways. `edge` bands the stripe set and the numeral outline;
// `core` fills them.
function jersey(
  base: string,
  edge: string,
  core: string,
  numberFill: string,
  collarPath: string
): UniformPart {
  return {
    base,
    layers: [...sleeveStripes(edge, core), ...collar(edge, core, collarPath)],
    number: { fill: numberFill, outline: core, outlineWidth: 26 },
  };
}

// The one shell, on all three kits. The cage is navy, not a neutral: every helmet figure on the
// GUD 2025 composite (nfl-uniform-refs/bears) wears a facemask painted the shell color, which
// samples #03182f there. That is the sheet's rendering of the club navy rather than a separate
// color, so the cage takes the archive's own stored navy (#0B162A) instead of an eyedrop — the
// same call the Rams' shell-colored cage got.
const HELMET_NAVY_C: UniformPart = {
  base: 'navy',
  facemask: 'navy',
  layers: [
    { id: 'bears-decal-keyline', d: BEARS_DECAL_KEYLINE_PATH, fill: 'white' },
    { id: 'bears-decal-letter', d: BEARS_DECAL_LETTER_PATH, fill: 'orange' },
  ].map((s): PartLayer => ({
    ...s,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
    fillRule: 'evenodd',
  })),
};

const PANTS_NAVY: UniformPart = {
  base: 'navy',
  layers: (
    [
      {
        id: 'bears-pants-outer-left',
        surface: 'leg-left',
        d: BEARS_PANTS_OUTER_LEFT,
        fill: 'orange',
      },
      {
        id: 'bears-pants-outer-right',
        surface: 'leg-right',
        d: BEARS_PANTS_OUTER_RIGHT,
        fill: 'orange',
      },
      {
        id: 'bears-pants-inner-left',
        surface: 'leg-left',
        d: BEARS_PANTS_INNER_LEFT,
        fill: 'white',
      },
      {
        id: 'bears-pants-inner-right',
        surface: 'leg-right',
        d: BEARS_PANTS_INNER_RIGHT,
        fill: 'white',
      },
    ] as const
  ).map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' })),
};

export const BEARS_CONSTRUCTION = {
  teamId: 'bears',
  // Jersey hexes, teamcolorcodes.com — the same three the curated rows carry.
  palette: { navy: '#0B162A', orange: '#C83803', white: '#FFFFFF' },
  helmets: { 'navy-c': HELMET_NAVY_C },
  pants: { navy: PANTS_NAVY },
  kits: {
    home: { helmet: 'navy-c', jersey: 'navy', pants: 'navy' },
    away: { helmet: 'navy-c', jersey: 'white', pants: 'navy' },
    'orange-alternate': { helmet: 'navy-c', jersey: 'orange', pants: 'navy' },
  },
};

export { BEARS_CLASSIC_COLLAR_PATH, BEARS_MODERN_COLLAR_PATH, jersey };
