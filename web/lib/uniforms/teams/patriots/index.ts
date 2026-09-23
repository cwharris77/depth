import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { PATRIOTS_PALETTE, PATRIOTS_HELMETS, PATRIOTS_PANTS, PATRIOTS_KITS } from './parts';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_PAT } from './jerseys/pat';
import { JERSEY_RIVALRIES } from './jerseys/rivalries';

export const PATRIOTS_PARTS: TeamPartsDefinition = {
  teamId: 'patriots',
  palette: PATRIOTS_PALETTE,
  helmets: PATRIOTS_HELMETS,
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    pat: JERSEY_PAT,
    rivalries: JERSEY_RIVALRIES,
  },
  pants: PATRIOTS_PANTS,
  kits: PATRIOTS_KITS,
};
export const PATRIOTS_UNIFORMS_FROM_PARTS = compileParts(PATRIOTS_PARTS);
