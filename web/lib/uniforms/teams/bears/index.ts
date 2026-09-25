import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { BEARS_PALETTE, BEARS_SPEC } from './parts';
import { BEARS_CATALOG } from './catalog';

export const BEARS_PARTS: TeamPartsDefinition = {
  teamId: 'bears',
  palette: BEARS_PALETTE,
  ...expandTeamSpec('bears', BEARS_SPEC),
  kits: catalogKits(BEARS_CATALOG),
};

export const BEARS_UNIFORMS_FROM_PARTS = compileParts(BEARS_PARTS);
