import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { RAVENS_PALETTE, RAVENS_HELMETS, RAVENS_PANTS, RAVENS_KITS } from './parts';
import { JERSEY_PURPLE } from './jerseys/purple';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BLACK } from './jerseys/black';

export const RAVENS_PARTS: TeamPartsDefinition = {
  teamId: 'ravens',
  palette: RAVENS_PALETTE,
  helmets: RAVENS_HELMETS,
  jerseys: {
    purple: JERSEY_PURPLE,
    white: JERSEY_WHITE,
    black: JERSEY_BLACK,
  },
  pants: RAVENS_PANTS,
  kits: RAVENS_KITS,
};
export const RAVENS_UNIFORMS_FROM_PARTS = compileParts(RAVENS_PARTS);
