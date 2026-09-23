import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { COLTS_CONSTRUCTION } from './parts';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';

export const COLTS_PARTS: TeamPartsDefinition = {
  ...COLTS_CONSTRUCTION,
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
  },
};

export const COLTS_UNIFORMS_FROM_PARTS = compileParts(COLTS_PARTS);
