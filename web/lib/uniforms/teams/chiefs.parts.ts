// Kansas City authored as composable parts. Geometry is imported unchanged from chiefs.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: both Chiefs kits wear the SAME red shell with the white
// arrowhead decal, and the SAME white pants — the away flat form reached the red shell through a
// 'secondary' override and home the pants through a white literal, four different spellings of
// two physical objects. Only the jersey actually differs: a red body at home vs a white body away,
// with the middle sleeve band gold in both and the outer bands taking the jersey body's contrast
// (white at home, red away).

import {
  CHIEFS_DECAL_ARROWHEAD_PATH,
  CHIEFS_SLEEVE_X_LEFT,
  CHIEFS_SLEEVE_X_RIGHT,
  CHIEFS_STRIPE_BOUNDS,
} from './chiefs';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// Three bands at the end of each sleeve: outer bands top and bottom in `outer`, one `middle`
// band between them. Mirrored across the jersey centerline, matching the flat form.
function sleeveStripes(outer: string, middle: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', CHIEFS_SLEEVE_X_LEFT],
    ['sleeve-right', CHIEFS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < CHIEFS_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = CHIEFS_STRIPE_BOUNDS[i];
    const bottom = CHIEFS_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `chiefs-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? middle : outer,
      });
    }
  }
  return out;
}

// The red shell with the white arrowhead decal — one object, shared by both kits. The arrowhead
// is a white region whose counters let the shell read through, so only the white is traced (see
// chiefs.ts); the shell color behind it is the part's base.
//
// Grey cage, sampled from the GUD helmet composite (nfl-uniform-refs/chiefs): the facemask bar
// reads #868686 against the red shell / white background, on both archived helmets. Matches the
// documented light-grey cage (Riddell light-gray facemask); the shared neutral #4b5158 it
// replaces is a darker grey than the real cage.
const HELMET_RED_ARROWHEAD: UniformPart = {
  base: 'red',
  facemask: 'grey',
  layers: [
    {
      id: 'chiefs-decal-arrowhead',
      surface: 'helmet' as const,
      d: CHIEFS_DECAL_ARROWHEAD_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ],
};

// Home jersey: red body, white outer sleeve bands with a gold middle, white numerals ringed gold.
const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: sleeveStripes('white', 'gold'),
  number: { fill: 'white', outline: 'gold', outlineWidth: 22 },
};

// Away jersey: white body, red outer sleeve bands with a gold middle, red numerals ringed gold.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes('red', 'gold'),
  number: { fill: 'red', outline: 'gold', outlineWidth: 22 },
};

// Plain white pants, shared by both kits. Home reaches this through a white literal in the flat
// form (its palette is red over gold), away through its primary; here it is one palette entry.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const CHIEFS_PARTS: TeamPartsDefinition = {
  teamId: 'chiefs',
  // Jersey hexes from the curated rows (teamcolorcodes) — the same three the rows carry across
  // the two kits, with gold occupying both secondary and accent on the home row.
  palette: {
    red: '#E31837',
    gold: '#FFB81C',
    white: '#FFFFFF',
    // The facemask cage grey — no token in the red/gold Chiefs palette. Sampled from the GUD
    // helmet composite (see the helmet part note); matches the documented light-grey cage.
    grey: '#868686',
  },
  helmets: { 'red-arrowhead': HELMET_RED_ARROWHEAD },
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'red-arrowhead', jersey: 'red', pants: 'white' },
    away: { helmet: 'red-arrowhead', jersey: 'white', pants: 'white' },
  },
};

export const CHIEFS_UNIFORMS_FROM_PARTS = compileParts(CHIEFS_PARTS);
