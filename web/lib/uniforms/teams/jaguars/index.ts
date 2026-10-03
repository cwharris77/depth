import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { JAGUARS_PALETTE, JAGUARS_SPEC } from './parts';
import { JAGUARS_CATALOG } from './catalog';

export const JAGUARS_PARTS: TeamPartsDefinition = {
  teamId: 'jaguars',
  palette: JAGUARS_PALETTE,
  ...expandTeamSpec('jaguars', JAGUARS_SPEC),
  kits: catalogKits(JAGUARS_CATALOG),
};

export const JAGUARS_UNIFORMS_FROM_PARTS = compileParts(JAGUARS_PARTS);
