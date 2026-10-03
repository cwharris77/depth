import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { PANTHERS_PALETTE, PANTHERS_SPEC } from './parts';
import { PANTHERS_CATALOG } from './catalog';

export const PANTHERS_PARTS: TeamPartsDefinition = {
  teamId: 'panthers',
  palette: PANTHERS_PALETTE,
  ...expandTeamSpec('panthers', PANTHERS_SPEC),
  kits: catalogKits(PANTHERS_CATALOG),
};

export const PANTHERS_UNIFORMS_FROM_PARTS = compileParts(PANTHERS_PARTS);
