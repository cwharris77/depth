import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { TITANS_CATALOG } from './catalog';
import { TITANS_PALETTE, TITANS_SPEC } from './parts';

export const TITANS_PARTS: TeamPartsDefinition = {
  teamId: 'titans',
  palette: TITANS_PALETTE,
  ...expandTeamSpec('titans', TITANS_SPEC),
  kits: catalogKits(TITANS_CATALOG),
};

export const TITANS_UNIFORMS_FROM_PARTS = compileParts(TITANS_PARTS);
