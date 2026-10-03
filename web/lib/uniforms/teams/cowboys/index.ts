import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { COWBOYS_PALETTE, COWBOYS_SPEC } from './parts';
import { COWBOYS_CATALOG } from './catalog';

export const COWBOYS_PARTS: TeamPartsDefinition = {
  teamId: 'cowboys',
  palette: COWBOYS_PALETTE,
  ...expandTeamSpec('cowboys', COWBOYS_SPEC),
  kits: catalogKits(COWBOYS_CATALOG),
};

export const COWBOYS_UNIFORMS_FROM_PARTS = compileParts(COWBOYS_PARTS);
