import { compileParts, type TeamPartsDefinition } from '../core/parts';
import {
  HELMET_BLACK,
  HELMET_SILVER,
  PANTS_BLACK,
  PANTS_BLUE,
  PANTS_SILVER,
  PANTS_WHITE,
} from './parts';
import { JERSEY_BLUE } from './jerseys/blue';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BLACK } from './jerseys/black';

export const PANTHERS_PARTS: TeamPartsDefinition = {
  teamId: 'panthers',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). Silver is the hex the archive
  // already stores as this club's black-alternate accent.
  palette: {
    blue: '#0085CA',
    black: '#101820',
    silver: '#A5ACAF',
    white: '#FFFFFF',
    // The mark's own highlight grey, read straight off the reference SVG rather than borrowed from
    // the kit's silver: fixed art does not recolour with the kit.
    markSilver: '#BFC0BF',
  },
  helmets: { black: HELMET_BLACK, silver: HELMET_SILVER },
  jerseys: { blue: JERSEY_BLUE, white: JERSEY_WHITE, black: JERSEY_BLACK },
  pants: { black: PANTS_BLACK, blue: PANTS_BLUE, white: PANTS_WHITE, silver: PANTS_SILVER },
  // Pant options enumerated from the 2025 composite, excluding its preseason-only block: the blue
  // jersey is worn with black and blue legs; the white jersey with black, white, blue and silver;
  // the black jersey with black and silver.
  kits: {
    home: { helmet: 'black', jersey: 'blue', pants: ['black', 'blue'] },
    away: { helmet: 'silver', jersey: 'white', pants: ['black', 'white', 'blue', 'silver'] },
    'black-alt': { helmet: 'silver', jersey: 'black', pants: ['black', 'silver'] },
  },
};

export const PANTHERS_UNIFORMS_FROM_PARTS = compileParts(PANTHERS_PARTS);
