import type { TeamCatalog } from './core/catalog';
import type { TeamPartsDefinition } from './core/parts';
import type { TeamSpec } from './core/team-spec';
import { BEARS_PARTS } from './bears';
import { BEARS_CATALOG } from './bears/catalog';
import { BEARS_SPEC } from './bears/parts';
import { BUCCANEERS_PARTS } from './buccaneers';
import { BUCCANEERS_CATALOG } from './buccaneers/catalog';
import { BUCCANEERS_SPEC } from './buccaneers/parts';
import { CHARGERS_PARTS } from './chargers';
import { CHARGERS_CATALOG } from './chargers/catalog';
import { CHARGERS_SPEC } from './chargers/parts';
import { BENGALS_PARTS } from './bengals';
import { BENGALS_CATALOG } from './bengals/catalog';
import { BENGALS_SPEC } from './bengals/parts';
import { BRONCOS_PARTS } from './broncos';
import { BRONCOS_CATALOG } from './broncos/catalog';
import { BRONCOS_SPEC } from './broncos/parts';
import { CHIEFS_PARTS } from './chiefs';
import { CHIEFS_CATALOG } from './chiefs/catalog';
import { CHIEFS_SPEC } from './chiefs/parts';
import { COLTS_PARTS } from './colts';
import { COLTS_CATALOG } from './colts/catalog';
import { COLTS_SPEC } from './colts/parts';
import { COMMANDERS_PARTS } from './commanders';
import { COMMANDERS_CATALOG } from './commanders/catalog';
import { COMMANDERS_SPEC } from './commanders/parts';
import { COWBOYS_PARTS } from './cowboys';
import { COWBOYS_CATALOG } from './cowboys/catalog';
import { COWBOYS_SPEC } from './cowboys/parts';
import { DOLPHINS_PARTS } from './dolphins';
import { DOLPHINS_CATALOG } from './dolphins/catalog';
import { DOLPHINS_SPEC } from './dolphins/parts';
import { EAGLES_PARTS } from './eagles';
import { EAGLES_CATALOG } from './eagles/catalog';
import { EAGLES_SPEC } from './eagles/parts';
import { FALCONS_PARTS } from './falcons';
import { FALCONS_CATALOG } from './falcons/catalog';
import { FALCONS_SPEC } from './falcons/parts';
import { JETS_PARTS } from './jets';
import { JETS_CATALOG } from './jets/catalog';
import { JETS_SPEC } from './jets/parts';
import { NINERS_PARTS } from './49ers';
import { NINERS_CATALOG } from './49ers/catalog';
import { NINERS_SPEC } from './49ers/parts';
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
  bengals: { catalog: BENGALS_CATALOG, parts: BENGALS_PARTS, strict: BENGALS_SPEC },
  broncos: { catalog: BRONCOS_CATALOG, parts: BRONCOS_PARTS, strict: BRONCOS_SPEC },
  buccaneers: {
    catalog: BUCCANEERS_CATALOG,
    parts: BUCCANEERS_PARTS,
    strict: BUCCANEERS_SPEC,
  },
  chargers: { catalog: CHARGERS_CATALOG, parts: CHARGERS_PARTS, strict: CHARGERS_SPEC },
  chiefs: { catalog: CHIEFS_CATALOG, parts: CHIEFS_PARTS, strict: CHIEFS_SPEC },
  commanders: {
    catalog: COMMANDERS_CATALOG,
    parts: COMMANDERS_PARTS,
    strict: COMMANDERS_SPEC,
  },
  cowboys: { catalog: COWBOYS_CATALOG, parts: COWBOYS_PARTS, strict: COWBOYS_SPEC },
  eagles: { catalog: EAGLES_CATALOG, parts: EAGLES_PARTS, strict: EAGLES_SPEC },
  falcons: { catalog: FALCONS_CATALOG, parts: FALCONS_PARTS, strict: FALCONS_SPEC },
  colts: { catalog: COLTS_CATALOG, parts: COLTS_PARTS, strict: COLTS_SPEC },
  dolphins: { catalog: DOLPHINS_CATALOG, parts: DOLPHINS_PARTS, strict: DOLPHINS_SPEC },
  jets: { catalog: JETS_CATALOG, parts: JETS_PARTS, strict: JETS_SPEC },
  '49ers': { catalog: NINERS_CATALOG, parts: NINERS_PARTS, strict: NINERS_SPEC },
  seahawks: { catalog: SEAHAWKS_CATALOG, parts: SEAHAWKS_PARTS, strict: SEAHAWKS_SPEC },
};

export function getTeamCatalog(teamId: string): TeamCatalog | undefined {
  return Object.hasOwn(CATALOGS, teamId) ? CATALOGS[teamId]?.catalog : undefined;
}

export function getAllTeamCatalogs(): RegisteredCatalog[] {
  return Object.values(CATALOGS).filter((entry): entry is RegisteredCatalog => entry !== undefined);
}
