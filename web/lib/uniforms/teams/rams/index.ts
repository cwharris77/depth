import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { RAMS_PALETTE, RAMS_HELMETS, RAMS_PANTS, RAMS_KITS } from './parts';
import { JERSEY_ROYAL } from './jerseys/royal';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_BONE } from './jerseys/bone';
import { JERSEY_RIVALRIES } from './jerseys/rivalries';

export const RAMS_PARTS: TeamPartsDefinition = {
  teamId: 'rams',
  palette: RAMS_PALETTE,
  helmets: RAMS_HELMETS,
  jerseys: {
    royal: JERSEY_ROYAL,
    white: JERSEY_WHITE,
    bone: JERSEY_BONE,
    rivalries: JERSEY_RIVALRIES,
  },
  pants: RAMS_PANTS,
  kits: RAMS_KITS,
};
export const RAMS_UNIFORMS_FROM_PARTS = compileParts(RAMS_PARTS);
