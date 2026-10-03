import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { RAVENS_PALETTE, RAVENS_SPEC } from './parts';
import { RAVENS_CATALOG } from './catalog';

export const RAVENS_PARTS: TeamPartsDefinition = {
  teamId: 'ravens',
  palette: RAVENS_PALETTE,
  ...expandTeamSpec('ravens', RAVENS_SPEC),
  kits: catalogKits(RAVENS_CATALOG),
};

export const RAVENS_UNIFORMS_FROM_PARTS = compileParts(RAVENS_PARTS);
