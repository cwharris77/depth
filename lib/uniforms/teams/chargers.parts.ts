// Los Angeles authored as composable parts. Geometry is imported unchanged from chargers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// All three kits are ONE construction, and the uniform is bolts: one on each shoulder cap and a much
// larger one on the shell, each a solid body inside a contrasting keyline. No sleeve stripe and no
// collar trim. The three kits combine one helmet (the white shell), two jerseys (powder-blue shared
// by home + powder-blue, white for away), and three pants — every jersey in the 2025 reference is
// worn with gold, white and powder-blue legs.
//
// The pants are plain here on purpose. Los Angeles wears a bolt down each leg, but on the SIDE seam,
// which a front-on mannequin cannot show; drawing it onto the leg's face would put a mark where the
// real pant has none. Everything invisible from the front stays out of the figure.
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
// Gold cage, sampled from the Chargers' 2025 GUD composite (nfl-uniform-refs/chargers); the
// reference helmet consistently shows the facemask in the team's lightning-bolt gold.
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'gold',
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

// The three legs the current kits are worn with, plus the navy the alternate needs. Plain colour —
// see the side-seam note in the header for why no bolt is drawn on them.
const PANTS_GOLD: UniformPart = { base: 'gold', layers: [] };
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
const PANTS_POWDER: UniformPart = { base: 'powderBlue', layers: [] };
// Navy is worn only with the navy alternate jersey and its navy shell, neither of which is in the
// archive yet, so no kit below references this part. It stays because the pant exists and the
// measurement is done; the kit that wears it is a separate curation ticket.
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };

export const CHARGERS_PARTS: TeamPartsDefinition = {
  teamId: 'chargers',
  // Jersey hexes from the curated rows (teamcolorcodes). Powder blue and gold are the physical body
  // colors; white is the shell/numerals literal (no white token on the home row).
  palette: {
    powderBlue: '#0080C6',
    gold: '#FFC20E',
    white: '#FFFFFF',
    // Navy pants sampled from the GUD 2025 composite (nfl-uniform-refs/chargers).
    navy: '#002244',
  },
  helmets: { white: HELMET_WHITE },
  jerseys: {
    powder: JERSEY_POWDER,
    white: JERSEY_WHITE,
  },
  pants: {
    gold: PANTS_GOLD,
    white: PANTS_WHITE,
    powder: PANTS_POWDER,
    navy: PANTS_NAVY,
  },
  // Canonical first, so the compiled definition and the committed raster are unchanged. The rest are
  // the options each jersey is actually drawn with on the 2025 composite — gold, white and powder
  // for both jerseys, and navy for neither: navy legs appear only under the navy alternate top.
  kits: {
    home: { helmet: 'white', jersey: 'powder', pants: ['gold', 'white', 'powder'] },
    away: { helmet: 'white', jersey: 'white', pants: ['gold', 'white', 'powder'] },
    'powder-blue': { helmet: 'white', jersey: 'powder', pants: ['gold', 'white', 'powder'] },
  },
};

export const CHARGERS_UNIFORMS_FROM_PARTS = compileParts(CHARGERS_PARTS);
