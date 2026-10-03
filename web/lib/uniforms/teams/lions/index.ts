import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { LIONS_PALETTE, LIONS_SPEC } from './parts';
import { LIONS_CATALOG } from './catalog';

export const LIONS_PARTS: TeamPartsDefinition = {
  teamId: 'lions',
  palette: LIONS_PALETTE,
  ...expandTeamSpec('lions', LIONS_SPEC),
  kits: catalogKits(LIONS_CATALOG),
};

export const LIONS_UNIFORMS_FROM_PARTS = compileParts(LIONS_PARTS);
