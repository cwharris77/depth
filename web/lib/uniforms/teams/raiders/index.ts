import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { RAIDERS_PALETTE, RAIDERS_SPEC } from './parts';
import { RAIDERS_CATALOG } from './catalog';

export const RAIDERS_PARTS: TeamPartsDefinition = {
  teamId: 'raiders',
  palette: RAIDERS_PALETTE,
  ...expandTeamSpec('raiders', RAIDERS_SPEC),
  kits: catalogKits(RAIDERS_CATALOG),
};

export const RAIDERS_UNIFORMS_FROM_PARTS = compileParts(RAIDERS_PARTS);
