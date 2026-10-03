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
import { BILLS_PARTS } from './bills';
import { BILLS_CATALOG } from './bills/catalog';
import { BILLS_SPEC } from './bills/parts';
import { BROWNS_PARTS } from './browns';
import { BROWNS_CATALOG } from './browns/catalog';
import { BROWNS_SPEC } from './browns/parts';
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
import { GIANTS_PARTS } from './giants';
import { GIANTS_CATALOG } from './giants/catalog';
import { GIANTS_SPEC } from './giants/parts';
import { JAGUARS_PARTS } from './jaguars';
import { JAGUARS_CATALOG } from './jaguars/catalog';
import { JAGUARS_SPEC } from './jaguars/parts';
import { JETS_PARTS } from './jets';
import { JETS_CATALOG } from './jets/catalog';
import { JETS_SPEC } from './jets/parts';
import { LIONS_PARTS } from './lions';
import { LIONS_CATALOG } from './lions/catalog';
import { LIONS_SPEC } from './lions/parts';
import { NINERS_PARTS } from './49ers';
import { NINERS_CATALOG } from './49ers/catalog';
import { NINERS_SPEC } from './49ers/parts';
import { PACKERS_PARTS } from './packers';
import { PACKERS_CATALOG } from './packers/catalog';
import { PACKERS_SPEC } from './packers/parts';
import { PANTHERS_PARTS } from './panthers';
import { PANTHERS_CATALOG } from './panthers/catalog';
import { PANTHERS_SPEC } from './panthers/parts';
import { PATRIOTS_PARTS } from './patriots';
import { PATRIOTS_CATALOG } from './patriots/catalog';
import { PATRIOTS_SPEC } from './patriots/parts';
import { RAIDERS_PARTS } from './raiders';
import { RAIDERS_CATALOG } from './raiders/catalog';
import { RAIDERS_SPEC } from './raiders/parts';
import { RAMS_PARTS } from './rams';
import { RAMS_CATALOG } from './rams/catalog';
import { RAMS_SPEC } from './rams/parts';
import { RAVENS_PARTS } from './ravens';
import { RAVENS_CATALOG } from './ravens/catalog';
import { RAVENS_SPEC } from './ravens/parts';
import { SAINTS_PARTS } from './saints';
import { SAINTS_CATALOG } from './saints/catalog';
import { SAINTS_SPEC } from './saints/parts';
import { SEAHAWKS_PARTS } from './seahawks';
import { SEAHAWKS_CATALOG } from './seahawks/catalog';
import { SEAHAWKS_SPEC } from './seahawks/parts';
import { STEELERS_PARTS } from './steelers';
import { STEELERS_CATALOG } from './steelers/catalog';
import { STEELERS_SPEC } from './steelers/parts';
import { TEXANS_PARTS } from './texans';
import { TEXANS_CATALOG } from './texans/catalog';
import { TEXANS_SPEC } from './texans/parts';
import { VIKINGS_PARTS } from './vikings';
import { VIKINGS_CATALOG } from './vikings/catalog';
import { VIKINGS_SPEC } from './vikings/parts';

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
  bills: { catalog: BILLS_CATALOG, parts: BILLS_PARTS, strict: BILLS_SPEC },
  browns: { catalog: BROWNS_CATALOG, parts: BROWNS_PARTS, strict: BROWNS_SPEC },
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
  jaguars: { catalog: JAGUARS_CATALOG, parts: JAGUARS_PARTS, strict: JAGUARS_SPEC },
  lions: { catalog: LIONS_CATALOG, parts: LIONS_PARTS, strict: LIONS_SPEC },
  giants: { catalog: GIANTS_CATALOG, parts: GIANTS_PARTS, strict: GIANTS_SPEC },
  falcons: { catalog: FALCONS_CATALOG, parts: FALCONS_PARTS, strict: FALCONS_SPEC },
  colts: { catalog: COLTS_CATALOG, parts: COLTS_PARTS, strict: COLTS_SPEC },
  dolphins: { catalog: DOLPHINS_CATALOG, parts: DOLPHINS_PARTS, strict: DOLPHINS_SPEC },
  jets: { catalog: JETS_CATALOG, parts: JETS_PARTS, strict: JETS_SPEC },
  '49ers': { catalog: NINERS_CATALOG, parts: NINERS_PARTS, strict: NINERS_SPEC },
  packers: { catalog: PACKERS_CATALOG, parts: PACKERS_PARTS, strict: PACKERS_SPEC },
  panthers: { catalog: PANTHERS_CATALOG, parts: PANTHERS_PARTS, strict: PANTHERS_SPEC },
  patriots: { catalog: PATRIOTS_CATALOG, parts: PATRIOTS_PARTS, strict: PATRIOTS_SPEC },
  raiders: { catalog: RAIDERS_CATALOG, parts: RAIDERS_PARTS, strict: RAIDERS_SPEC },
  rams: { catalog: RAMS_CATALOG, parts: RAMS_PARTS, strict: RAMS_SPEC },
  ravens: { catalog: RAVENS_CATALOG, parts: RAVENS_PARTS, strict: RAVENS_SPEC },
  saints: { catalog: SAINTS_CATALOG, parts: SAINTS_PARTS, strict: SAINTS_SPEC },
  seahawks: { catalog: SEAHAWKS_CATALOG, parts: SEAHAWKS_PARTS, strict: SEAHAWKS_SPEC },
  steelers: { catalog: STEELERS_CATALOG, parts: STEELERS_PARTS, strict: STEELERS_SPEC },
  texans: { catalog: TEXANS_CATALOG, parts: TEXANS_PARTS, strict: TEXANS_SPEC },
  vikings: { catalog: VIKINGS_CATALOG, parts: VIKINGS_PARTS, strict: VIKINGS_SPEC },
};

export function getTeamCatalog(teamId: string): TeamCatalog | undefined {
  return Object.hasOwn(CATALOGS, teamId) ? CATALOGS[teamId]?.catalog : undefined;
}

export function getAllTeamCatalogs(): RegisteredCatalog[] {
  return Object.values(CATALOGS).filter((entry): entry is RegisteredCatalog => entry !== undefined);
}
