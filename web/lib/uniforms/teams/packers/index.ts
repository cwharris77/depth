import { compileParts, type TeamPartsDefinition } from '../core/parts';
import {
  HELMET_GOLD,
  HELMET_LEATHER,
  HELMET_WHITE,
  PANTS_GOLD,
  PANTS_LEATHER,
  PANTS_WHITE,
} from './parts';
import { JERSEY_GREEN } from './jerseys/green';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_NAVY } from './jerseys/navy';

export const PACKERS_PARTS: TeamPartsDefinition = {
  teamId: 'packers',
  // Construction hexes from the module (official hexes plus the sampled 1923 leather). Green, gold
  // and white are physical fixed colors the rows carry in different primary/secondary/accent
  // slots; the 1923 navy body and bronze trim have their own row tokens.
  palette: {
    green: '#203731',
    gold: '#FFB612',
    white: '#FFFFFF',
    // Exact foreground colors from the supplied Packers G SVG, kept separate from construction
    // colors because the source green, white, and gold are each visibly distinct.
    '#213832': '#213832',
    '#FCFCFC': '#FCFCFC',
    '#FEB415': '#FEB415',
    // The 1923 leather shell and pants, sampled from the composite (no token; see packers.ts).
    leather: '#7B4A2A',
    // The modern gold/white shell's cage — mid-grey, sampled from the composite (packers
    // current-season 2025, reads #8f8f90 at the gold shell's face opening). Named sources
    // describe the modern Packers mask as grey/light grey; the shared neutral #4b5158 it replaces
    // is a darker grey than the real cage. The 1923 leather shell predates the facemask and stays
    // on the default.
    cageGrey: '#8F8F90',
    // The 1923 navy body and bronze trim are the kit's own primary/secondary.
    navy: '#1B2C4E',
    bronze: '#CC8835',
  },
  helmets: { gold: HELMET_GOLD, leather: HELMET_LEATHER, white: HELMET_WHITE },
  jerseys: {
    green: JERSEY_GREEN,
    white: JERSEY_WHITE,
    navy: JERSEY_NAVY,
  },
  pants: { gold: PANTS_GOLD, leather: PANTS_LEATHER, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'gold', jersey: 'green', pants: 'gold' },
    away: { helmet: 'gold', jersey: 'white', pants: 'gold' },
    'winter-warning': { helmet: 'white', jersey: 'white', pants: 'white' },
    '1923-throwback': { helmet: 'leather', jersey: 'navy', pants: 'leather' },
  },
};

export const PACKERS_UNIFORMS_FROM_PARTS = compileParts(PACKERS_PARTS);
