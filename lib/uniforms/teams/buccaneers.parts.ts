// Tampa Bay authored as composable parts. Geometry is imported unchanged from buccaneers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// NOT one construction. The current kits (home, away) wear a single solid band at the sleeve hem
// and a thin collar keyline on a PEWTER shell with the flag decal; the creamsicle wears a three-band
// cuff, red over white over red, no collar trim, on a WHITE shell that stays bare (the old Bucco
// Bruce pirate head fails the trace test). The three kits combine two helmets (pewter+flag shared
// by home/away, bare white creamsicle) and three jerseys (red, white, creamsicle) over one pair of
// white pants.

import {
  BUCCANEERS_COLLAR_PATH,
  BUCCANEERS_COLLAR_WIDTH,
  BUCCANEERS_CREAM_BOUNDS,
  BUCCANEERS_CUFF_LEFT,
  BUCCANEERS_CUFF_RIGHT,
  BUCCANEERS_DECAL_BALL_PATH,
  BUCCANEERS_DECAL_FIELD_PATH,
  BUCCANEERS_DECAL_KEYLINE_PATH,
  BUCCANEERS_DECAL_SKULL_PATH,
  BUCCANEERS_FLAG_KEYLINE,
  BUCCANEERS_FLAG_ORANGE,
  BUCCANEERS_FLAG_RED,
  BUCCANEERS_SLEEVE_X_LEFT,
  BUCCANEERS_SLEEVE_X_RIGHT,
} from './buccaneers';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

const BUCCANEERS_WHITE = '#FFFFFF';

// The single solid cuff band at the sleeve hem.
function cuff(color: string): PartLayer[] {
  return [
    {
      id: 'buccaneers-cuff-left',
      surface: 'sleeve-left',
      d: BUCCANEERS_CUFF_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'buccaneers-cuff-right',
      surface: 'sleeve-right',
      d: BUCCANEERS_CUFF_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// The creamsicle's three-band cuff (red, white, red) — authored contiguous.
function creamCuff(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', BUCCANEERS_SLEEVE_X_LEFT],
    ['sleeve-right', BUCCANEERS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < BUCCANEERS_CREAM_BOUNDS.length - 1; i += 1) {
    const top = BUCCANEERS_CREAM_BOUNDS[i];
    const bottom = BUCCANEERS_CREAM_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `buccaneers-cream-band-${i}-${side}`,
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

// The thin collar keyline.
function collar(color: string): PartLayer[] {
  return [
    {
      id: 'buccaneers-collar',
      surface: 'collar',
      d: BUCCANEERS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: BUCCANEERS_COLLAR_WIDTH,
    },
  ];
}

// The flag decal: KEYLINE, red field, white skull, orange football. Fixed art on both pewter
// shells — the same four colors everywhere, so nothing takes a team token. The creamsicle's white
// shell does NOT get it.
function flagDecal(): PartLayer[] {
  return [
    {
      id: 'buccaneers-decal-keyline',
      surface: 'helmet',
      d: BUCCANEERS_DECAL_KEYLINE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'flagKeyline',
    },
    {
      id: 'buccaneers-decal-field',
      surface: 'helmet',
      d: BUCCANEERS_DECAL_FIELD_PATH,
      clip: true,
      kind: 'fill',
      fill: 'flagRed',
    },
    {
      id: 'buccaneers-decal-skull',
      surface: 'helmet',
      d: BUCCANEERS_DECAL_SKULL_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'buccaneers-decal-ball',
      surface: 'helmet',
      d: BUCCANEERS_DECAL_BALL_PATH,
      clip: true,
      kind: 'fill',
      fill: 'flagOrange',
    },
  ];
}

// The pewter shell with the flag decal — shared by home and away.
//
// White cage. The pewter shell wears the SF2BD-SW-SP white mask (named sources; the modern pewter
// shell pairs with a white/light cage). The shared neutral #4b5158 it replaces is a grey that
// reads muddy against pewter.
const HELMET_PEWTER_FLAG: UniformPart = {
  base: 'pewter',
  facemask: 'white',
  layers: flagDecal(),
};

// The creamsicle's white shell, bare (its Bucco Bruce mark fails the trace test), with the same
// white cage as the pewter shell.
const HELMET_WHITE: UniformPart = { base: 'white', facemask: 'white', layers: [] };

// Home jersey: red body, pewter cuff and collar, white numerals ringed orange (two-ring trim
// approximated to the single orange outline, see buccaneers.ts).
const JERSEY_RED: UniformPart = {
  base: 'red',
  layers: [...cuff('pewter'), ...collar('pewter')],
  number: { fill: 'white', outline: 'orange', outlineWidth: 14 },
};

// Away jersey: white body, pewter cuff and collar, red numerals ringed pewter.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...cuff('pewter'), ...collar('pewter')],
  number: { fill: 'red', outline: 'pewter', outlineWidth: 14 },
};

// Creamsicle jersey: orange body, three-band red/white/red cuff, no collar trim, white numerals
// ringed red.
const JERSEY_CREAMSICLE: UniformPart = {
  base: 'creamOrange',
  layers: creamCuff('crimson', 'white'),
  number: { fill: 'white', outline: 'crimson', outlineWidth: 14 },
};

// One pair of white pants shared by all three kits.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const BUCCANEERS_PARTS: TeamPartsDefinition = {
  teamId: 'buccaneers',
  // Construction hexes from the module (teamcolorcodes). Red/pewter/orange/white are the physical
  // colors carried in different primary/secondary/accent slots per row; the flag's keyline/red/
  // orange are the sampled fixed-art colors.
  palette: {
    red: '#D50A0A',
    pewter: '#34302B',
    orange: '#FF7900',
    // The creamsicle's crimson (its own secondary #C8102E), distinct from the modern red.
    crimson: '#C8102E',
    // The creamsicle's own orange (its primary #FF8200), distinct from the modern orange.
    creamOrange: '#FF8200',
    white: BUCCANEERS_WHITE,
    flagKeyline: BUCCANEERS_FLAG_KEYLINE,
    flagRed: BUCCANEERS_FLAG_RED,
    flagOrange: BUCCANEERS_FLAG_ORANGE,
  },
  helmets: { 'pewter-flag': HELMET_PEWTER_FLAG, white: HELMET_WHITE },
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
    creamsicle: JERSEY_CREAMSICLE,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'pewter-flag', jersey: 'red', pants: 'white' },
    away: { helmet: 'pewter-flag', jersey: 'white', pants: 'white' },
    creamsicle: { helmet: 'white', jersey: 'creamsicle', pants: 'white' },
  },
};

export const BUCCANEERS_UNIFORMS_FROM_PARTS = compileParts(BUCCANEERS_PARTS);
