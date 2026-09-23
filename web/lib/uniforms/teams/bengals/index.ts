import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { BENGALS_CONSTRUCTION } from './parts';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_WHITE_TIGER } from './jerseys/white-tiger';
import { JERSEY_ORANGE_TIGER } from './jerseys/orange-tiger';

export const BENGALS_PARTS: TeamPartsDefinition = {
  ...BENGALS_CONSTRUCTION,
  jerseys: {
    black: JERSEY_BLACK,
    'white-tiger': JERSEY_WHITE_TIGER,
    'orange-tiger': JERSEY_ORANGE_TIGER,
  },
};

export const BENGALS_UNIFORMS_FROM_PARTS = compileParts(BENGALS_PARTS);
