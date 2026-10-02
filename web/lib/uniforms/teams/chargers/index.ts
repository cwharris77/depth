import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { CHARGERS_PALETTE, CHARGERS_SPEC } from './parts';
import { CHARGERS_CATALOG } from './catalog';

export const CHARGERS_PARTS: TeamPartsDefinition = {
  teamId: 'chargers',
  palette: CHARGERS_PALETTE,
  ...expandTeamSpec('chargers', CHARGERS_SPEC),
  kits: catalogKits(CHARGERS_CATALOG),
};

export const CHARGERS_UNIFORMS_FROM_PARTS = compileParts(CHARGERS_PARTS);
