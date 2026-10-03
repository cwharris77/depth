import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { FALCONS_PALETTE, FALCONS_SPEC } from './parts';
import { FALCONS_CATALOG } from './catalog';

export const FALCONS_PARTS: TeamPartsDefinition = {
  teamId: 'falcons',
  palette: FALCONS_PALETTE,
  ...expandTeamSpec('falcons', FALCONS_SPEC),
  kits: catalogKits(FALCONS_CATALOG),
};

export const FALCONS_UNIFORMS_FROM_PARTS = compileParts(FALCONS_PARTS);
