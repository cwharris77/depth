import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { CHIEFS_PALETTE, CHIEFS_SPEC } from './parts';
import { CHIEFS_CATALOG } from './catalog';

export const CHIEFS_PARTS: TeamPartsDefinition = {
  teamId: 'chiefs',
  palette: CHIEFS_PALETTE,
  ...expandTeamSpec('chiefs', CHIEFS_SPEC),
  kits: catalogKits(CHIEFS_CATALOG),
};

export const CHIEFS_UNIFORMS_FROM_PARTS = compileParts(CHIEFS_PARTS);
