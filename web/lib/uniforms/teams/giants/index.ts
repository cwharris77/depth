import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { GIANTS_PALETTE, GIANTS_SPEC } from './parts';
import { GIANTS_CATALOG } from './catalog';

export const GIANTS_PARTS: TeamPartsDefinition = {
  teamId: 'giants',
  palette: GIANTS_PALETTE,
  ...expandTeamSpec('giants', GIANTS_SPEC),
  kits: catalogKits(GIANTS_CATALOG),
};

export const GIANTS_UNIFORMS_FROM_PARTS = compileParts(GIANTS_PARTS);
