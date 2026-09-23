import { BEARS_UNIFORMS_FROM_PARTS } from './bears';
import { BENGALS_UNIFORMS_FROM_PARTS } from './bengals';

import { BILLS_UNIFORMS_FROM_PARTS } from './bills';
import { BRONCOS_UNIFORMS_FROM_PARTS } from './broncos';
import { BROWNS_UNIFORMS_FROM_PARTS } from './browns';
import { BUCCANEERS_UNIFORMS_FROM_PARTS } from './buccaneers';
import { CARDINALS_UNIFORMS_FROM_PARTS } from './cardinals';
import { CHARGERS_UNIFORMS_FROM_PARTS } from './chargers';
import { CHIEFS_UNIFORMS_FROM_PARTS } from './chiefs';
import { COLTS_UNIFORMS_FROM_PARTS } from './colts';
import { COMMANDERS_UNIFORMS_FROM_PARTS } from './commanders';
import { COWBOYS_UNIFORMS_FROM_PARTS } from './cowboys';
import { DOLPHINS_UNIFORMS_FROM_PARTS } from './dolphins';
import { EAGLES_UNIFORMS_FROM_PARTS } from './eagles';
import { FALCONS_UNIFORMS_FROM_PARTS } from './falcons';
import { GIANTS_UNIFORMS_FROM_PARTS } from './giants';
import { JAGUARS_UNIFORMS_FROM_PARTS } from './jaguars';
import { JETS_UNIFORMS_FROM_PARTS } from './jets';
import { LIONS_UNIFORMS_FROM_PARTS } from './lions';
import { NINERS_UNIFORMS_FROM_PARTS } from './niners';
import { PACKERS_UNIFORMS_FROM_PARTS } from './packers';
import { PANTHERS_UNIFORMS_FROM_PARTS } from './panthers';
import { PATRIOTS_UNIFORMS_FROM_PARTS } from './patriots';
import { RAIDERS_UNIFORMS_FROM_PARTS } from './raiders';
import { RAMS_UNIFORMS_FROM_PARTS } from './rams';
import { RAVENS_UNIFORMS_FROM_PARTS } from './ravens';
import { SAINTS_UNIFORMS_FROM_PARTS } from './saints';
import { SEAHAWKS_UNIFORMS_FROM_PARTS } from './seahawks';
import { STEELERS_UNIFORMS_FROM_PARTS } from './steelers';
import { TEXANS_UNIFORMS_FROM_PARTS } from './texans';
import { TITANS_UNIFORMS_FROM_PARTS } from './titans';
import { VIKINGS_UNIFORMS_FROM_PARTS } from './vikings';
import type { TeamUniformDefinition } from './core/types';

// Server-boundary registry for team construction definitions. Each team index owns its assembled
// definition and keeps the composition details behind that team boundary.

const DEFINITIONS: Readonly<Partial<Record<string, TeamUniformDefinition>>> = {
  bears: BEARS_UNIFORMS_FROM_PARTS,
  bengals: BENGALS_UNIFORMS_FROM_PARTS,
  bills: BILLS_UNIFORMS_FROM_PARTS,
  broncos: BRONCOS_UNIFORMS_FROM_PARTS,
  browns: BROWNS_UNIFORMS_FROM_PARTS,
  buccaneers: BUCCANEERS_UNIFORMS_FROM_PARTS,
  cardinals: CARDINALS_UNIFORMS_FROM_PARTS,
  chargers: CHARGERS_UNIFORMS_FROM_PARTS,
  chiefs: CHIEFS_UNIFORMS_FROM_PARTS,
  colts: COLTS_UNIFORMS_FROM_PARTS,
  commanders: COMMANDERS_UNIFORMS_FROM_PARTS,
  cowboys: COWBOYS_UNIFORMS_FROM_PARTS,
  dolphins: DOLPHINS_UNIFORMS_FROM_PARTS,
  '49ers': NINERS_UNIFORMS_FROM_PARTS,
  eagles: EAGLES_UNIFORMS_FROM_PARTS,
  falcons: FALCONS_UNIFORMS_FROM_PARTS,
  giants: GIANTS_UNIFORMS_FROM_PARTS,
  jaguars: JAGUARS_UNIFORMS_FROM_PARTS,
  jets: JETS_UNIFORMS_FROM_PARTS,
  lions: LIONS_UNIFORMS_FROM_PARTS,
  packers: PACKERS_UNIFORMS_FROM_PARTS,
  panthers: PANTHERS_UNIFORMS_FROM_PARTS,
  patriots: PATRIOTS_UNIFORMS_FROM_PARTS,
  raiders: RAIDERS_UNIFORMS_FROM_PARTS,
  rams: RAMS_UNIFORMS_FROM_PARTS,
  ravens: RAVENS_UNIFORMS_FROM_PARTS,
  saints: SAINTS_UNIFORMS_FROM_PARTS,
  seahawks: SEAHAWKS_UNIFORMS_FROM_PARTS,
  steelers: STEELERS_UNIFORMS_FROM_PARTS,
  texans: TEXANS_UNIFORMS_FROM_PARTS,
  titans: TITANS_UNIFORMS_FROM_PARTS,
  vikings: VIKINGS_UNIFORMS_FROM_PARTS,
};

export function getTeamUniformDefinition(teamId: string): TeamUniformDefinition | undefined {
  return Object.hasOwn(DEFINITIONS, teamId) ? DEFINITIONS[teamId] : undefined;
}

export function getAllTeamUniformDefinitions(): Readonly<
  Partial<Record<string, TeamUniformDefinition>>
> {
  return DEFINITIONS;
}
