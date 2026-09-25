import type { TeamCatalog } from './core/catalog';
import type { TeamPartsDefinition } from './core/parts';
import type { TeamSpec } from './core/team-spec';
import { BEARS_PARTS } from './bears';
import { BEARS_CATALOG } from './bears/catalog';
import { BEARS_SPEC } from './bears/parts';
import { BRONCOS_PARTS } from './broncos';
import { BRONCOS_CATALOG } from './broncos/catalog';
import { BRONCOS_SPEC } from './broncos/parts';
import { SEAHAWKS_PARTS } from './seahawks';
import { SEAHAWKS_CATALOG } from './seahawks/catalog';
import { SEAHAWKS_SPEC } from './seahawks/parts';

// Teams whose rows, accents and kits come from a catalog. A team joins when it converts; the
// rest keep their hand-written rows in data.ts.
export interface RegisteredCatalog {
  catalog: TeamCatalog;
  parts: TeamPartsDefinition;
  // Present once the team is strict: its parts come only from this spec.
  strict?: TeamSpec;
}

const CATALOGS: Readonly<Partial<Record<string, RegisteredCatalog>>> = {
  bears: { catalog: BEARS_CATALOG, parts: BEARS_PARTS, strict: BEARS_SPEC },
  broncos: { catalog: BRONCOS_CATALOG, parts: BRONCOS_PARTS, strict: BRONCOS_SPEC },
  seahawks: { catalog: SEAHAWKS_CATALOG, parts: SEAHAWKS_PARTS, strict: SEAHAWKS_SPEC },
};

export function getTeamCatalog(teamId: string): TeamCatalog | undefined {
  return Object.hasOwn(CATALOGS, teamId) ? CATALOGS[teamId]?.catalog : undefined;
}

export function getAllTeamCatalogs(): RegisteredCatalog[] {
  return Object.values(CATALOGS).filter((entry): entry is RegisteredCatalog => entry !== undefined);
}
