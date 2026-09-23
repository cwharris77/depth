import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { BEARS_CONSTRUCTION } from './parts';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_ORANGE } from './jerseys/orange';

export const BEARS_PARTS: TeamPartsDefinition = {
  ...BEARS_CONSTRUCTION,
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    orange: JERSEY_ORANGE,
  },
};

export const BEARS_UNIFORMS_FROM_PARTS = compileParts(BEARS_PARTS);
