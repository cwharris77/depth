import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { NINERS_CONSTRUCTION } from './parts';
import { JERSEY_RED } from './jerseys/red';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BLACK } from './jerseys/black';

export const NINERS_PARTS: TeamPartsDefinition = {
  ...NINERS_CONSTRUCTION,
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
  },
};

export const NINERS_UNIFORMS_FROM_PARTS = compileParts(NINERS_PARTS);
