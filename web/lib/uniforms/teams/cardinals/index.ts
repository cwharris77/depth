import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { CARDINALS_CATALOG } from './catalog';
import { CARDINALS_PALETTE, CARDINALS_SPEC } from './parts';

export const CARDINALS_PARTS: TeamPartsDefinition = {
  teamId: 'cardinals',
  palette: CARDINALS_PALETTE,
  ...expandTeamSpec('cardinals', CARDINALS_SPEC),
  kits: catalogKits(CARDINALS_CATALOG),
};

export const CARDINALS_UNIFORMS_FROM_PARTS = compileParts(CARDINALS_PARTS);
