import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { CHARGERS_CONSTRUCTION } from './parts';
import { JERSEY_POWDER } from './jerseys/powder';
import { JERSEY_WHITE } from './jerseys/white';

export const CHARGERS_PARTS: TeamPartsDefinition = {
  ...CHARGERS_CONSTRUCTION,
  jerseys: {
    powder: JERSEY_POWDER,
    white: JERSEY_WHITE,
  },
};

export const CHARGERS_UNIFORMS_FROM_PARTS = compileParts(CHARGERS_PARTS);
