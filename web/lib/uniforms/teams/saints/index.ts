import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { SAINTS_PALETTE, SAINTS_HELMETS, SAINTS_PANTS, SAINTS_KITS } from './parts';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_WHITE } from './jerseys/white';

export const SAINTS_PARTS: TeamPartsDefinition = {
  teamId: 'saints',
  palette: SAINTS_PALETTE,
  helmets: SAINTS_HELMETS,
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
  },
  pants: SAINTS_PANTS,
  kits: SAINTS_KITS,
};
export const SAINTS_UNIFORMS_FROM_PARTS = compileParts(SAINTS_PARTS);
