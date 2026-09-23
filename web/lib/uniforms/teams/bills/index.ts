import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { BILLS_CONSTRUCTION } from './parts';
import { JERSEY_BLUE } from './jerseys/blue';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_RIVALRIES } from './jerseys/rivalries';

export const BILLS_PARTS: TeamPartsDefinition = {
  ...BILLS_CONSTRUCTION,
  jerseys: {
    blue: JERSEY_BLUE,
    white: JERSEY_WHITE,
    rivalries: JERSEY_RIVALRIES,
  },
};

export const BILLS_UNIFORMS_FROM_PARTS = compileParts(BILLS_PARTS);
