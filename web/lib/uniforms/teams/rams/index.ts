import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { RAMS_PALETTE, RAMS_SPEC } from './parts';
import { RAMS_CATALOG } from './catalog';

export const RAMS_PARTS: TeamPartsDefinition = {
  teamId: 'rams',
  palette: RAMS_PALETTE,
  ...expandTeamSpec('rams', RAMS_SPEC),
  kits: catalogKits(RAMS_CATALOG),
};

export const RAMS_UNIFORMS_FROM_PARTS = compileParts(RAMS_PARTS);
