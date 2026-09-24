import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { HELMET_BLUE_BARE, HELMET_BLUE_MONOGRAM, PANTS_WHITE } from './parts';
import { JERSEY_ROYAL } from './jerseys/royal';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_THROWBACK } from './jerseys/throwback';

export const GIANTS_PARTS: TeamPartsDefinition = {
  teamId: 'giants',
  // Jersey hexes from the curated rows. Royal and red are physical fixed colors
  // that the three rows carry across different primary/secondary/accent slots (royal is home and
  // throwback primary, away secondary; red is home and away accent, throwback secondary).
  palette: {
    royal: '#0B2265',
    // White is a literal on home and the throwback (no white token on those rows); the away row
    // carries it as primary.
    white: '#FFFFFF',
    red: '#A71930',
    // The modern shell's cage grey — no token in the blue/red/white Giants palette. Sampled from
    // the composite (see the helmet note); matches the documented grey facemask.
    cageGrey: '#9A9A9A',
  },
  helmets: { 'blue-monogram': HELMET_BLUE_MONOGRAM, 'blue-bare': HELMET_BLUE_BARE },
  jerseys: {
    royal: JERSEY_ROYAL,
    white: JERSEY_WHITE,
    throwback: JERSEY_THROWBACK,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'blue-monogram', jersey: 'royal', pants: 'white' },
    away: { helmet: 'blue-monogram', jersey: 'white', pants: 'white' },
    '1980s-throwback': { helmet: 'blue-bare', jersey: 'throwback', pants: 'white' },
  },
};

export const GIANTS_UNIFORMS_FROM_PARTS = compileParts(GIANTS_PARTS);
