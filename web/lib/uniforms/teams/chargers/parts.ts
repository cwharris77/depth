// Los Angeles authored as composable parts. Geometry is imported unchanged from chargers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The primary kits and gold alternate share a white helmet; the navy alternate has its own shell.
// All use bolts on the shoulder and helmet without sleeve stripes.
//
// The pants are plain here on purpose. Los Angeles wears a bolt down each leg, but on the SIDE seam,
// which a front-on mannequin cannot show; drawing it onto the leg's face would put a mark where the
// real pant has none. Everything invisible from the front stays out of the figure.
//
// Home and powder-blue share the same rendered construction.

import {
  CHARGERS_BOLT_BODY_LEFT,
  CHARGERS_BOLT_BODY_RIGHT,
  CHARGERS_BOLT_KEYLINE_LEFT,
  CHARGERS_BOLT_KEYLINE_RIGHT,
  CHARGERS_DECAL_BOLT_PATH,
  CHARGERS_DECAL_KEYLINE_PATH,
  CHARGERS_HELMET_NUMBER_THREE,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

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

// The white shell with the bolt and powder-blue player numeral.
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'gold',
  layers: [
    ...decal('powderBlue', 'gold'),
    {
      id: 'chargers-white-helmet-number',
      surface: 'helmet',
      d: CHARGERS_HELMET_NUMBER_THREE,
      clip: true,
      kind: 'fill',
      fill: 'powderBlue',
    },
  ],
};

const HELMET_NAVY: UniformPart = {
  base: 'navy',
  facemask: 'navy',
  layers: [
    ...decal('gold', 'white'),
    {
      id: 'chargers-navy-helmet-number',
      surface: 'helmet',
      d: CHARGERS_HELMET_NUMBER_THREE,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ],
};

// Powder-blue jersey (home + powder-blue): powder-blue body, white-keylined gold sleeve bolts,
// white numerals keylined gold.

// Away jersey: white body, blue-keylined gold sleeve bolts, blue numerals keylined gold.

// The primary kits' legs plus navy for the alternate. Plain colour —
// see the side-seam note in the header for why no bolt is drawn on them.
const PANTS_GOLD: UniformPart = { base: 'gold', layers: [] };
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
const PANTS_POWDER: UniformPart = { base: 'powderBlue', layers: [] };
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };

export const CHARGERS_CONSTRUCTION = {
  teamId: 'chargers',
  // Jersey hexes from the curated rows. Powder blue and gold are the physical body
  // colors; white is the shell/numerals literal (no white token on the home row).
  palette: {
    powderBlue: '#0080C6',
    gold: '#FFC20E',
    white: '#FFFFFF',
    navy: '#002244',
  },
  helmets: { white: HELMET_WHITE, navy: HELMET_NAVY },
  pants: {
    gold: PANTS_GOLD,
    white: PANTS_WHITE,
    powder: PANTS_POWDER,
    navy: PANTS_NAVY,
  },
  // Canonical pants first; navy belongs to the navy alternate only.
  kits: {
    home: { helmet: 'white', jersey: 'powder', pants: ['gold', 'white', 'powder'] },
    away: { helmet: 'white', jersey: 'white', pants: ['gold', 'white', 'powder'] },
    'powder-blue': { helmet: 'white', jersey: 'powder', pants: ['gold', 'white', 'powder'] },
    'charger-power': { helmet: 'white', jersey: 'gold', pants: ['gold', 'white'] },
    'super-chargers': { helmet: 'navy', jersey: 'navy', pants: 'navy' },
  },
};

export { bolts };
