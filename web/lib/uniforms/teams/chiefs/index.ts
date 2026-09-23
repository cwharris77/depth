import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { CHIEFS_CONSTRUCTION } from './parts';
import { JERSEY_RED } from './jerseys/red';
import { JERSEY_WHITE } from './jerseys/white';

export const CHIEFS_PARTS: TeamPartsDefinition = {
  ...CHIEFS_CONSTRUCTION,
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
  },
};

export const CHIEFS_UNIFORMS_FROM_PARTS = compileParts(CHIEFS_PARTS);
