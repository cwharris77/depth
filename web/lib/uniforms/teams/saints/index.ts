import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { SAINTS_PALETTE, SAINTS_SPEC } from './parts';
import { SAINTS_CATALOG } from './catalog';

export const SAINTS_PARTS: TeamPartsDefinition = {
  teamId: 'saints',
  palette: SAINTS_PALETTE,
  ...expandTeamSpec('saints', SAINTS_SPEC),
  kits: catalogKits(SAINTS_CATALOG),
};

export const SAINTS_UNIFORMS_FROM_PARTS = compileParts(SAINTS_PARTS);
