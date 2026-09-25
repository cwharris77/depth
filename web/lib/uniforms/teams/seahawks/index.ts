import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { SEAHAWKS_PALETTE, SEAHAWKS_SPEC } from './parts';
import { SEAHAWKS_CATALOG } from './catalog';

export const SEAHAWKS_PARTS: TeamPartsDefinition = {
  teamId: 'seahawks',
  palette: SEAHAWKS_PALETTE,
  ...expandTeamSpec('seahawks', SEAHAWKS_SPEC),
  kits: catalogKits(SEAHAWKS_CATALOG),
};
export const SEAHAWKS_UNIFORMS_FROM_PARTS = compileParts(SEAHAWKS_PARTS);
