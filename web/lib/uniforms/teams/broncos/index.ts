import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { BRONCOS_CONSTRUCTION } from './parts';
import { JERSEY_ORANGE } from './jerseys/orange';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_CRUSH } from './jerseys/crush';

export const BRONCOS_PARTS: TeamPartsDefinition = {
  ...BRONCOS_CONSTRUCTION,
  jerseys: {
    orange: JERSEY_ORANGE,
    white: JERSEY_WHITE,
    crush: JERSEY_CRUSH,
  },
};

export const BRONCOS_UNIFORMS_FROM_PARTS = compileParts(BRONCOS_PARTS);
