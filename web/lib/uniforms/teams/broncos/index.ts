import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { BRONCOS_PALETTE, BRONCOS_SPEC } from './parts';
import { BRONCOS_CATALOG } from './catalog';

export const BRONCOS_PARTS: TeamPartsDefinition = {
  teamId: 'broncos',
  palette: BRONCOS_PALETTE,
  ...expandTeamSpec('broncos', BRONCOS_SPEC),
  kits: catalogKits(BRONCOS_CATALOG),
};

export const BRONCOS_UNIFORMS_FROM_PARTS = compileParts(BRONCOS_PARTS);
