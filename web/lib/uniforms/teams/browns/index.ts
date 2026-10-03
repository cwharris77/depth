import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { BROWNS_CATALOG } from './catalog';
import { BROWNS_PALETTE, BROWNS_SPEC } from './parts';

export const BROWNS_PARTS: TeamPartsDefinition = {
  teamId: 'browns',
  palette: BROWNS_PALETTE,
  ...expandTeamSpec('browns', BROWNS_SPEC),
  kits: catalogKits(BROWNS_CATALOG),
};

export const BROWNS_UNIFORMS_FROM_PARTS = compileParts(BROWNS_PARTS);
