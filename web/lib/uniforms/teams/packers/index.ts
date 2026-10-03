import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { PACKERS_PALETTE, PACKERS_SPEC } from './parts';
import { PACKERS_CATALOG } from './catalog';

export const PACKERS_PARTS: TeamPartsDefinition = {
  teamId: 'packers',
  palette: PACKERS_PALETTE,
  ...expandTeamSpec('packers', PACKERS_SPEC),
  kits: catalogKits(PACKERS_CATALOG),
};

export const PACKERS_UNIFORMS_FROM_PARTS = compileParts(PACKERS_PARTS);
