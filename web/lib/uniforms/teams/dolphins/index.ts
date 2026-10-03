import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { DOLPHINS_PALETTE, DOLPHINS_SPEC } from './parts';
import { DOLPHINS_CATALOG } from './catalog';

export const DOLPHINS_PARTS: TeamPartsDefinition = {
  teamId: 'dolphins',
  palette: DOLPHINS_PALETTE,
  ...expandTeamSpec('dolphins', DOLPHINS_SPEC),
  kits: catalogKits(DOLPHINS_CATALOG),
};

export const DOLPHINS_UNIFORMS_FROM_PARTS = compileParts(DOLPHINS_PARTS);
