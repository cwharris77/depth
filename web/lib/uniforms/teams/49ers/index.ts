import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { NINERS_PALETTE, NINERS_SPEC } from './parts';
import { NINERS_CATALOG } from './catalog';

export const NINERS_PARTS: TeamPartsDefinition = {
  teamId: '49ers',
  palette: NINERS_PALETTE,
  ...expandTeamSpec('49ers', NINERS_SPEC),
  kits: catalogKits(NINERS_CATALOG),
};

export const NINERS_UNIFORMS_FROM_PARTS = compileParts(NINERS_PARTS);
