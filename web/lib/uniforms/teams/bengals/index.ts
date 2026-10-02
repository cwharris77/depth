import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { BENGALS_PALETTE, BENGALS_SPEC } from './parts';
import { BENGALS_CATALOG } from './catalog';

export const BENGALS_PARTS: TeamPartsDefinition = {
  teamId: 'bengals',
  palette: BENGALS_PALETTE,
  ...expandTeamSpec('bengals', BENGALS_SPEC),
  kits: catalogKits(BENGALS_CATALOG),
};

export const BENGALS_UNIFORMS_FROM_PARTS = compileParts(BENGALS_PARTS);
