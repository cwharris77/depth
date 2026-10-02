import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { COMMANDERS_PALETTE, COMMANDERS_SPEC } from './parts';
import { COMMANDERS_CATALOG } from './catalog';

export const COMMANDERS_PARTS: TeamPartsDefinition = {
  teamId: 'commanders',
  palette: COMMANDERS_PALETTE,
  ...expandTeamSpec('commanders', COMMANDERS_SPEC),
  kits: catalogKits(COMMANDERS_CATALOG),
};

export const COMMANDERS_UNIFORMS_FROM_PARTS = compileParts(COMMANDERS_PARTS);
