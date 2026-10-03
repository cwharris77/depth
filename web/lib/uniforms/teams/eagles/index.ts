import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { EAGLES_PALETTE, EAGLES_SPEC } from './parts';
import { EAGLES_CATALOG } from './catalog';

export const EAGLES_PARTS: TeamPartsDefinition = {
  teamId: 'eagles',
  palette: EAGLES_PALETTE,
  ...expandTeamSpec('eagles', EAGLES_SPEC),
  kits: catalogKits(EAGLES_CATALOG),
};

export const EAGLES_UNIFORMS_FROM_PARTS = compileParts(EAGLES_PARTS);
