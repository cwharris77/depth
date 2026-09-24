// New Orleans authored as composable parts. Geometry is imported unchanged from saints.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The construction is unusually spare: no sleeve bands, no shoulder yoke, no pant stripe — what
// carries the uniform is a bold gold V-collar and gold numerals, plus the black fleur-de-lis on
// the shell. The three kits combine only two jerseys and two pants: home and color-rush both wear
// a BLACK body (home over gold pants, color-rush over black), and away is the white body (over
// black). The fleur is black on every kit.

import {
  SAINTS_COLLAR_WIDTH,
  SAINTS_DECAL_BLACK_OUTER_PATH,
  SAINTS_DECAL_GOLD_PATH,
  SAINTS_DECAL_WHITE_PATH,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';
import { GENERIC_COLLAR_PATH } from '../core/shared';

// The gold V-collar — the same bold band on every kit.
export function collar(stroke: string): PartLayer[] {
  return [
    {
      id: 'saints-collar',
      surface: 'collar',
      d: GENERIC_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: SAINTS_COLLAR_WIDTH,
    },
  ];
}

// The gold shell carries the source fleur's four exact paint layers, shared by every kit.
//
// Gold cage. The Saints' gold shell carries a gold facemask (named sources; the composite
// cannot separate a gold cage from the same-toned shell, so the named source and the team's gold
// #D3BC8D are the source of truth). The shared neutral #4b5158 it replaces is a grey smudge
// against the gold.
const HELMET_GOLD_FLEUR: UniformPart = {
  base: 'gold',
  facemask: 'gold',
  layers: [
    {
      id: 'saints-decal-black',
      surface: 'helmet',
      d: SAINTS_DECAL_BLACK_OUTER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decal-black',
    },
    {
      id: 'saints-decal-gold',
      surface: 'helmet',
      d: SAINTS_DECAL_GOLD_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decal-gold',
    },
    {
      id: 'saints-decal-white',
      surface: 'helmet',
      d: SAINTS_DECAL_WHITE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'decal-white',
    },
  ],
};

// Black jersey (home + color-rush): gold collar, gold numerals keylined white.

// White jersey (away): gold collar, black numerals keylined gold.

// Home pants, gold.
const PANTS_GOLD: UniformPart = { base: 'gold', layers: [] };

// Black pants (away + color-rush).
const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

export const SAINTS_PALETTE = {
  gold: '#D3BC8D',
  black: '#101820',
  white: '#FFFFFF',
  'decal-black': '#010001',
  'decal-gold': '#D1BB8F',
  'decal-white': '#F9F9F9',
};
export const SAINTS_HELMETS = { 'gold-fleur': HELMET_GOLD_FLEUR };
export const SAINTS_PANTS = { gold: PANTS_GOLD, black: PANTS_BLACK };
export const SAINTS_KITS = {
  home: { helmet: 'gold-fleur', jersey: 'black', pants: 'gold' },
  away: { helmet: 'gold-fleur', jersey: 'white', pants: 'black' },
  'color-rush': { helmet: 'gold-fleur', jersey: 'black', pants: 'black' },
};
