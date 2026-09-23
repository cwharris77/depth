import { EAGLES_BLACK } from './source';
import { compileParts, type TeamPartsDefinition } from '../core/parts';
import {
  HELMET_BLACK,
  HELMET_GREEN,
  HELMET_KELLY,
  PANTS_BLACK,
  PANTS_GREEN,
  PANTS_KELLY,
  PANTS_WHITE,
} from './parts';
import { JERSEY_GREEN } from './jerseys/green';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_KELLY_ORIGINAL } from './jerseys/kelly-original';
import { JERSEY_KELLY_MODERN } from './jerseys/kelly-modern';

export const EAGLES_PARTS: TeamPartsDefinition = {
  teamId: 'eagles',
  // Construction hexes from the module / curated rows. Green/kelly/black/white/silver are the
  // physical colors carried in different primary/secondary/accent slots per row.
  palette: {
    green: '#004C54',
    kelly: '#046A38',
    black: EAGLES_BLACK,
    white: '#FFFFFF',
    silver: '#A5ACAF',
  },
  helmets: { green: HELMET_GREEN, kelly: HELMET_KELLY, black: HELMET_BLACK },
  jerseys: {
    green: JERSEY_GREEN,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
    'kelly-original': JERSEY_KELLY_ORIGINAL,
    'kelly-modern': JERSEY_KELLY_MODERN,
  },
  pants: { green: PANTS_GREEN, white: PANTS_WHITE, black: PANTS_BLACK, kelly: PANTS_KELLY },
  kits: {
    home: { helmet: 'green', jersey: 'green', pants: 'green' },
    away: { helmet: 'green', jersey: 'white', pants: 'white' },
    'black-alt': { helmet: 'black', jersey: 'black', pants: 'black' },
    // Existing archive IDs derive this legacy slug; it remains the original-era construction.
    'kelly-green': { helmet: 'kelly', jersey: 'kelly-original', pants: 'kelly' },
    'kelly-green-original': { helmet: 'kelly', jersey: 'kelly-original', pants: 'kelly' },
    'kelly-green-modern': { helmet: 'kelly', jersey: 'kelly-modern', pants: 'kelly' },
  },
};

export const EAGLES_UNIFORMS_FROM_PARTS = compileParts(EAGLES_PARTS);
