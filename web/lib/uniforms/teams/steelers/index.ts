import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { STEELERS_PALETTE, STEELERS_HELMETS, STEELERS_PANTS, STEELERS_KITS } from './parts';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BUMBLEBEE } from './jerseys/bumblebee';

export const STEELERS_PARTS: TeamPartsDefinition = {
  teamId: 'steelers',
  palette: STEELERS_PALETTE,
  helmets: STEELERS_HELMETS,
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
    bumblebee: JERSEY_BUMBLEBEE,
  },
  pants: STEELERS_PANTS,
  kits: STEELERS_KITS,
};
export const STEELERS_UNIFORMS_FROM_PARTS = compileParts(STEELERS_PARTS);
