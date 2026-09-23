import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { VIKINGS_PALETTE, VIKINGS_HELMETS, VIKINGS_PANTS, VIKINGS_KITS } from './parts';
import { JERSEY_PURPLE } from './jerseys/purple';
import { JERSEY_PURPLE_CLASSIC } from './jerseys/purple-classic';
import { JERSEY_WHITE } from './jerseys/white';

export const VIKINGS_PARTS: TeamPartsDefinition = {
  teamId: 'vikings',
  palette: VIKINGS_PALETTE,
  helmets: VIKINGS_HELMETS,
  jerseys: {
    purple: JERSEY_PURPLE,
    'purple-classic': JERSEY_PURPLE_CLASSIC,
    white: JERSEY_WHITE,
  },
  pants: VIKINGS_PANTS,
  kits: VIKINGS_KITS,
};
export const VIKINGS_UNIFORMS_FROM_PARTS = compileParts(VIKINGS_PARTS);
