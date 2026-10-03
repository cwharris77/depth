import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { VIKINGS_CATALOG } from './catalog';
import { VIKINGS_PALETTE, VIKINGS_SPEC } from './parts';

export const VIKINGS_PARTS: TeamPartsDefinition = {
  teamId: 'vikings',
  palette: VIKINGS_PALETTE,
  ...expandTeamSpec('vikings', VIKINGS_SPEC),
  kits: catalogKits(VIKINGS_CATALOG),
};

export const VIKINGS_UNIFORMS_FROM_PARTS = compileParts(VIKINGS_PARTS);
