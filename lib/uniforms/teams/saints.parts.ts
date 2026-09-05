// New Orleans authored as composable parts. Geometry is imported unchanged from saints.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The construction is unusually spare: no sleeve bands, no shoulder yoke, no pant stripe — what
// carries the uniform is a bold gold V-collar and gold numerals, plus the black fleur-de-lis on
// the shell. The three kits combine only two jerseys and two pants: home and color-rush both wear
// a BLACK body (home over gold pants, color-rush over black), and away is the white body (over
// black). The fleur is black on every kit.

import { SAINTS_COLLAR_WIDTH, SAINTS_DECAL_PATH } from './saints';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';

// The gold V-collar — the same bold band on every kit.
function collar(stroke: string): PartLayer[] {
  return [
    {
      id: 'saints-collar',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: SAINTS_COLLAR_WIDTH,
    },
  ];
}

// The black shell with the fleur-de-lis (black, one solid fill — the interior white line is too
// fine to trace, see saints.ts) — one object, shared by every kit.
//
// Gold cage. The Saints' gold shell carries a gold facemask (named sources; the GUD composite
// cannot separate a gold cage from the same-toned shell, so the named source and the team's gold
// #D3BC8D are the source of truth). The shared neutral #4b5158 it replaces is a grey smudge
// against the gold.
const HELMET_GOLD_FLEUR: UniformPart = {
  base: 'gold',
  facemask: 'gold',
  layers: [
    {
      id: 'saints-decal',
      surface: 'helmet',
      d: SAINTS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: 'black',
    },
  ],
};

// Black jersey (home + color-rush): gold collar, gold numerals keylined white.
const JERSEY_BLACK: UniformPart = {
  base: 'black',
  layers: collar('gold'),
  number: { fill: 'gold', outline: 'white', outlineWidth: 12 },
};

// White jersey (away): gold collar, black numerals keylined gold.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: collar('gold'),
  number: { fill: 'black', outline: 'gold', outlineWidth: 12 },
};

// Home pants, gold.
const PANTS_GOLD: UniformPart = { base: 'gold', layers: [] };

// Black pants (away + color-rush).
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const SAINTS_PARTS: TeamPartsDefinition = {
  teamId: 'saints',
  // Jersey hexes from the curated rows (teamcolorcodes). Gold is the shell/body color carried in
  // different primary/secondary/accent slots per row; black is home/away/crush's shared body.
  palette: {
    gold: '#D3BC8D',
    black: '#101820',
    white: '#FFFFFF',
  },
  helmets: { 'gold-fleur': HELMET_GOLD_FLEUR },
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
  },
  pants: { gold: PANTS_GOLD, black: PANTS_BLACK },
  kits: {
    home: { helmet: 'gold-fleur', jersey: 'black', pants: 'gold' },
    away: { helmet: 'gold-fleur', jersey: 'white', pants: 'black' },
    'color-rush': { helmet: 'gold-fleur', jersey: 'black', pants: 'black' },
  },
};

export const SAINTS_UNIFORMS_FROM_PARTS = compileParts(SAINTS_PARTS);
