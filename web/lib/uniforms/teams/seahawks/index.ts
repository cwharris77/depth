import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { SEAHAWKS_PALETTE, SEAHAWKS_HELMETS, SEAHAWKS_PANTS, SEAHAWKS_KITS } from './parts';
import { SEAHAWKS_JERSEY_NAVY } from './jerseys/navy';
import { SEAHAWKS_JERSEY_WHITE } from './jerseys/white';
import { SEAHAWKS_JERSEY_ROYAL_1976 } from './jerseys/royal-1976';
import { SEAHAWKS_RIVALRIES_JERSEY } from './jerseys/rivalries-2025';

export const SEAHAWKS_PARTS: TeamPartsDefinition = {
  teamId: 'seahawks',
  palette: SEAHAWKS_PALETTE,
  helmets: SEAHAWKS_HELMETS,
  jerseys: {
    navy: SEAHAWKS_JERSEY_NAVY,
    white: SEAHAWKS_JERSEY_WHITE,
    'royal-1976': SEAHAWKS_JERSEY_ROYAL_1976,
    'rivalries-silver': SEAHAWKS_RIVALRIES_JERSEY,
  },
  pants: SEAHAWKS_PANTS,
  kits: SEAHAWKS_KITS,
};
export const SEAHAWKS_UNIFORMS_FROM_PARTS = compileParts(SEAHAWKS_PARTS);
