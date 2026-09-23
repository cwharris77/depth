import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { TEXANS_PALETTE, TEXANS_HELMETS, TEXANS_PANTS, TEXANS_KITS } from './parts';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_RED } from './jerseys/red';

export const TEXANS_PARTS: TeamPartsDefinition = {
  teamId: 'texans',
  palette: TEXANS_PALETTE,
  helmets: TEXANS_HELMETS,
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    red: JERSEY_RED,
  },
  pants: TEXANS_PANTS,
  kits: TEXANS_KITS,
};
export const TEXANS_UNIFORMS_FROM_PARTS = compileParts(TEXANS_PARTS);
