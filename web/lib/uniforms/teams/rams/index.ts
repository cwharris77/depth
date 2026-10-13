import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { RAMS_PALETTE, RAMS_SPEC } from './parts';
import { RAMS_CATALOG } from './catalog';
import { RAMS_NUMBER_PATTERNS } from './marks/numbers';

export const RAMS_PARTS: TeamPartsDefinition = {
  teamId: 'rams',
  palette: RAMS_PALETTE,
  patterns: RAMS_NUMBER_PATTERNS,
  ...expandTeamSpec('rams', RAMS_SPEC),
  kits: catalogKits(RAMS_CATALOG),
};

export const RAMS_UNIFORMS_FROM_PARTS = compileParts(RAMS_PARTS);
