import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { CARDINALS_CONSTRUCTION } from './parts';
import { JERSEY_RED } from './jerseys/red';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_RIVALRIES } from './jerseys/rivalries';

export const CARDINALS_PARTS: TeamPartsDefinition = {
  ...CARDINALS_CONSTRUCTION,
  jerseys: {
    red: JERSEY_RED,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
    rivalries: JERSEY_RIVALRIES,
  },
};

export const CARDINALS_UNIFORMS_FROM_PARTS = compileParts(CARDINALS_PARTS);
