import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { catalogKits } from '../core/catalog';
import { expandTeamSpec } from '../core/team-spec';
import { BUCCANEERS_PALETTE, BUCCANEERS_SPEC } from './parts';
import { BUCCANEERS_CATALOG } from './catalog';

export const BUCCANEERS_PARTS: TeamPartsDefinition = {
  teamId: 'buccaneers',
  palette: BUCCANEERS_PALETTE,
  ...expandTeamSpec('buccaneers', BUCCANEERS_SPEC),
  kits: catalogKits(BUCCANEERS_CATALOG),
};

export const BUCCANEERS_UNIFORMS_FROM_PARTS = compileParts(BUCCANEERS_PARTS);
