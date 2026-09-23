import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { RAIDERS_PALETTE, RAIDERS_HELMETS, RAIDERS_PANTS, RAIDERS_KITS } from './parts';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_WHITE } from './jerseys/white';

export const RAIDERS_PARTS: TeamPartsDefinition = {
  teamId: 'raiders',
  palette: RAIDERS_PALETTE,
  helmets: RAIDERS_HELMETS,
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
  },
  pants: RAIDERS_PANTS,
  kits: RAIDERS_KITS,
};
export const RAIDERS_UNIFORMS_FROM_PARTS = compileParts(RAIDERS_PARTS);
