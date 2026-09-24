import { compileParts, type TeamPartsDefinition } from '../core/parts';
import {
  HELMET_BLACK,
  HELMET_GREEN,
  HELMET_RIV_GREEN,
  PANTS_BLACK,
  PANTS_GREEN,
  PANTS_RIV,
  PANTS_WHITE,
} from './parts';
import { JERSEY_GREEN } from './jerseys/green';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_RIV } from './jerseys/riv';
import { JERSEY_BLACK } from './jerseys/black';

export const JETS_PARTS: TeamPartsDefinition = {
  teamId: 'jets',
  // Jersey hexes from the curated rows. The two greens differ by a step.
  palette: {
    green: '#125740',
    rivalGreen: '#115740',
    black: '#000000',
    white: '#FFFFFF',
  },
  helmets: { green: HELMET_GREEN, riv: HELMET_RIV_GREEN, black: HELMET_BLACK },
  jerseys: {
    green: JERSEY_GREEN,
    white: JERSEY_WHITE,
    riv: JERSEY_RIV,
    black: JERSEY_BLACK,
  },
  pants: { green: PANTS_GREEN, white: PANTS_WHITE, riv: PANTS_RIV, black: PANTS_BLACK },
  kits: {
    home: { helmet: 'green', jersey: 'green', pants: 'green' },
    away: { helmet: 'green', jersey: 'white', pants: 'white' },
    'rivalries-2025': { helmet: 'riv', jersey: 'riv', pants: 'riv' },
    'black-alt': { helmet: 'black', jersey: 'black', pants: 'black' },
  },
};

export const JETS_UNIFORMS_FROM_PARTS = compileParts(JETS_PARTS);
