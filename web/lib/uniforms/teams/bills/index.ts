import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { BILLS_CATALOG } from './catalog';
import { BILLS_PALETTE, BILLS_SPEC } from './parts';

export const BILLS_PARTS: TeamPartsDefinition = {
  teamId: 'bills',
  palette: BILLS_PALETTE,
  ...expandTeamSpec('bills', BILLS_SPEC),
  kits: catalogKits(BILLS_CATALOG),
};

export const BILLS_UNIFORMS_FROM_PARTS = compileParts(BILLS_PARTS);
