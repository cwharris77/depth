import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { PATRIOTS_PALETTE, PATRIOTS_SPEC } from './parts';
import { PATRIOTS_CATALOG } from './catalog';

export const PATRIOTS_PARTS: TeamPartsDefinition = {
  teamId: 'patriots',
  palette: PATRIOTS_PALETTE,
  ...expandTeamSpec('patriots', PATRIOTS_SPEC),
  kits: catalogKits(PATRIOTS_CATALOG),
};

export const PATRIOTS_UNIFORMS_FROM_PARTS = compileParts(PATRIOTS_PARTS);
