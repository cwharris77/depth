import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { COLTS_PALETTE, COLTS_SPEC } from './parts';
import { COLTS_CATALOG } from './catalog';

export const COLTS_PARTS: TeamPartsDefinition = {
  teamId: 'colts',
  palette: COLTS_PALETTE,
  ...expandTeamSpec('colts', COLTS_SPEC),
  kits: catalogKits(COLTS_CATALOG),
};

export const COLTS_UNIFORMS_FROM_PARTS = compileParts(COLTS_PARTS);
