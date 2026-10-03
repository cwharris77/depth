import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { TEXANS_CATALOG } from './catalog';
import { TEXANS_PALETTE, TEXANS_SPEC } from './parts';

export const TEXANS_PARTS: TeamPartsDefinition = {
  teamId: 'texans',
  palette: TEXANS_PALETTE,
  ...expandTeamSpec('texans', TEXANS_SPEC),
  kits: catalogKits(TEXANS_CATALOG),
};

export const TEXANS_UNIFORMS_FROM_PARTS = compileParts(TEXANS_PARTS);
