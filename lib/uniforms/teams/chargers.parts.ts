// Los Angeles authored as composable parts. Geometry is imported unchanged from chargers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// All three kits are ONE construction, and the whole uniform is two marks: a lightning bolt on each
// shoulder cap and a much larger one on the shell, each a solid gold body inside a contrasting
// keyline. No sleeve stripe, no collar trim, no pant stripe. The three kits combine one helmet (the
// white shell), two jerseys (powder-blue shared by home + powder-blue, white for away), and one pair
// of gold pants.
//
// NOTE: home and powder-blue render IDENTICALLY by design — both rows store primary #0080C6 over
// gold, differing only in accent — and the 2025 reference draws exactly one powder-blue jersey. The
// spec flags this as a known pixel-identical pair to surface, not to silently collapse.

import {
  CHARGERS_BOLT_BODY_LEFT,
  CHARGERS_BOLT_BODY_RIGHT,
  CHARGERS_BOLT_KEYLINE_LEFT,
  CHARGERS_BOLT_KEYLINE_RIGHT,
  CHARGERS_DECAL_BOLT_PATH,
  CHARGERS_DECAL_KEYLINE_PATH,
} from './chargers';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// Keyline first, body over it — the paint order every trimmed mark here uses.
function bolts(keyline: string, body: string): PartLayer[] {
  const shapes: [string, UniformSurface, string, string][] = [
    ['chargers-bolt-keyline-left', 'sleeve-left', CHARGERS_BOLT_KEYLINE_LEFT, keyline],
    ['chargers-bolt-keyline-right', 'sleeve-right', CHARGERS_BOLT_KEYLINE_RIGHT, keyline],
    ['chargers-bolt-body-left', 'sleeve-left', CHARGERS_BOLT_BODY_LEFT, body],
    ['chargers-bolt-body-right', 'sleeve-right', CHARGERS_BOLT_BODY_RIGHT, body],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

// The shell's large bolt: white/blue keyline under the gold body.
function decal(keyline: string, body: string): PartLayer[] {
  return [
    {
      id: 'chargers-decal-keyline',
      surface: 'helmet',
      d: CHARGERS_DECAL_KEYLINE_PATH,
      clip: true,
      kind: 'fill',
      fill: keyline,
    },
    {
      id: 'chargers-decal-bolt',
      surface: 'helmet',
      d: CHARGERS_DECAL_BOLT_PATH,
      clip: true,
      kind: 'fill',
      fill: body,
    },
  ];
}

// The white shell with the bolt — one object, shared by all three kits.
//
// White cage. The white Chargers shell wears a white facemask (named sources; white-on-white
// matches the shell).
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: decal('powderBlue', 'gold'),
};

// Powder-blue jersey (home + powder-blue): powder-blue body, white-keylined gold sleeve bolts,
// white numerals keylined gold.
const JERSEY_POWDER: UniformPart = {
  base: 'powderBlue',
  layers: bolts('white', 'gold'),
  number: { fill: 'white', outline: 'gold', outlineWidth: 12 },
};

// Away jersey: white body, blue-keylined gold sleeve bolts, blue numerals keylined gold.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: bolts('powderBlue', 'gold'),
  number: { fill: 'powderBlue', outline: 'gold', outlineWidth: 12 },
};

// Gold pants, shared by all three kits (the pants sample as unbroken gold on both figures).
const PANTS_GOLD: UniformPart = { base: 'gold', layers: [] };

export const CHARGERS_PARTS: TeamPartsDefinition = {
  teamId: 'chargers',
  // Jersey hexes from the curated rows (teamcolorcodes). Powder blue and gold are the physical body
  // colors; white is the shell/numerals literal (no white token on the home row).
  palette: {
    powderBlue: '#0080C6',
    gold: '#FFC20E',
    white: '#FFFFFF',
  },
  helmets: { white: HELMET_WHITE },
  jerseys: {
    powder: JERSEY_POWDER,
    white: JERSEY_WHITE,
  },
  pants: { gold: PANTS_GOLD },
  kits: {
    home: { helmet: 'white', jersey: 'powder', pants: 'gold' },
    away: { helmet: 'white', jersey: 'white', pants: 'gold' },
    'powder-blue': { helmet: 'white', jersey: 'powder', pants: 'gold' },
  },
};

export const CHARGERS_UNIFORMS_FROM_PARTS = compileParts(CHARGERS_PARTS);
