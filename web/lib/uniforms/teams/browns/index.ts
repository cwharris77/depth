import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { BROWNS_CONSTRUCTION } from './parts';
import { JERSEY_BROWN } from './jerseys/brown';
import { JERSEY_WHITE } from './jerseys/white';

export const BROWNS_PARTS: TeamPartsDefinition = {
  ...BROWNS_CONSTRUCTION,
  jerseys: {
    brown: JERSEY_BROWN,
    white: JERSEY_WHITE,
  },
};

export const BROWNS_UNIFORMS_FROM_PARTS = compileParts(BROWNS_PARTS);
