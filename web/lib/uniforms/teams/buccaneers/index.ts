import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { BUCCANEERS_CONSTRUCTION } from './parts';
import { JERSEY_RED } from './jerseys/red';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_CREAMSICLE } from './jerseys/creamsicle';

export const BUCCANEERS_PARTS: TeamPartsDefinition = {
  ...BUCCANEERS_CONSTRUCTION,
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
    creamsicle: JERSEY_CREAMSICLE,
  },
};

export const BUCCANEERS_UNIFORMS_FROM_PARTS = compileParts(BUCCANEERS_PARTS);
