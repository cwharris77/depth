import type { TeamCatalog } from './core/catalog';
import type { TeamPartsDefinition } from './core/parts';
import { SEAHAWKS_PARTS } from './seahawks';
import { SEAHAWKS_CATALOG } from './seahawks/catalog';

// Teams whose rows, accents and kits come from a catalog. A team joins when it converts; the
// rest keep their hand-written rows in data.ts.
export interface RegisteredCatalog {
  catalog: TeamCatalog;
  parts: TeamPartsDefinition;
}

const CATALOGS: Readonly<Partial<Record<string, RegisteredCatalog>>> = {
  seahawks: { catalog: SEAHAWKS_CATALOG, parts: SEAHAWKS_PARTS },
};

export function getTeamCatalog(teamId: string): TeamCatalog | undefined {
  return Object.hasOwn(CATALOGS, teamId) ? CATALOGS[teamId]?.catalog : undefined;
}

export function getAllTeamCatalogs(): RegisteredCatalog[] {
  return Object.values(CATALOGS).filter((entry): entry is RegisteredCatalog => entry !== undefined);
}
