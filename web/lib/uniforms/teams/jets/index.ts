import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { JETS_PALETTE, JETS_SPEC } from './parts';
import { JETS_CATALOG } from './catalog';

export const JETS_PARTS: TeamPartsDefinition = {
  teamId: 'jets',
  palette: JETS_PALETTE,
  ...expandTeamSpec('jets', JETS_SPEC),
  kits: catalogKits(JETS_CATALOG),
};

export const JETS_UNIFORMS_FROM_PARTS = compileParts(JETS_PARTS);
