import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { STEELERS_PALETTE, STEELERS_SPEC } from './parts';
import { STEELERS_CATALOG } from './catalog';

export const STEELERS_PARTS: TeamPartsDefinition = {
  teamId: 'steelers',
  palette: STEELERS_PALETTE,
  ...expandTeamSpec('steelers', STEELERS_SPEC),
  kits: catalogKits(STEELERS_CATALOG),
};

export const STEELERS_UNIFORMS_FROM_PARTS = compileParts(STEELERS_PARTS);
