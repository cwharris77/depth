import { BEARS_UNIFORMS_FROM_PARTS } from './bears.parts';
import { BENGALS_UNIFORMS_FROM_PARTS } from './bengals.parts';

import { BILLS_UNIFORMS_FROM_PARTS } from './bills.parts';
import { BRONCOS_UNIFORMS } from './broncos';
import { BROWNS_UNIFORMS } from './browns';
import { BUCCANEERS_UNIFORMS } from './buccaneers';
import { CARDINALS_UNIFORMS } from './cardinals';
import { CHARGERS_UNIFORMS } from './chargers';
import { CHIEFS_UNIFORMS_FROM_PARTS } from './chiefs.parts';
import { COLTS_UNIFORMS_FROM_PARTS } from './colts.parts';
import { COMMANDERS_UNIFORMS } from './commanders';
import { COWBOYS_UNIFORMS_FROM_PARTS } from './cowboys.parts';
import { DOLPHINS_UNIFORMS } from './dolphins';
import { EAGLES_UNIFORMS } from './eagles';
import { FALCONS_UNIFORMS_FROM_PARTS } from './falcons.parts';
import { GIANTS_UNIFORMS_FROM_PARTS } from './giants.parts';
import { JAGUARS_UNIFORMS } from './jaguars';
import { JETS_UNIFORMS } from './jets';
import { LIONS_UNIFORMS_FROM_PARTS } from './lions.parts';
import { NINERS_UNIFORMS_FROM_PARTS } from './niners.parts';
import { PACKERS_UNIFORMS_FROM_PARTS } from './packers.parts';
import { PANTHERS_UNIFORMS } from './panthers';
import { PATRIOTS_UNIFORMS } from './patriots';
import { RAIDERS_UNIFORMS_FROM_PARTS } from './raiders.parts';
import { RAMS_UNIFORMS } from './rams';
import { RAVENS_UNIFORMS } from './ravens';
import { SAINTS_UNIFORMS_FROM_PARTS } from './saints.parts';
import { SEAHAWKS_UNIFORMS_FROM_PARTS } from './seahawks.parts';
import { STEELERS_UNIFORMS_FROM_PARTS } from './steelers.parts';
import { TEXANS_UNIFORMS_FROM_PARTS } from './texans.parts';
import { TITANS_UNIFORMS_FROM_PARTS } from './titans.parts';
import { VIKINGS_UNIFORMS } from './vikings';
import type { TeamUniformDefinition } from './types';

// Server-boundary registry for team construction definitions. Teams migrate to the composable
// parts model (./parts.ts) one at a time — a `*_FROM_PARTS` entry is compiled from a
// TeamPartsDefinition, a bare one is still authored flat. Both produce the same shape.

const DEFINITIONS: Readonly<Partial<Record<string, TeamUniformDefinition>>> = {
  bears: BEARS_UNIFORMS_FROM_PARTS,
  bengals: BENGALS_UNIFORMS_FROM_PARTS,
  bills: BILLS_UNIFORMS_FROM_PARTS,
  broncos: BRONCOS_UNIFORMS,
  browns: BROWNS_UNIFORMS,
  buccaneers: BUCCANEERS_UNIFORMS,
  cardinals: CARDINALS_UNIFORMS,
  chargers: CHARGERS_UNIFORMS,
  chiefs: CHIEFS_UNIFORMS_FROM_PARTS,
  colts: COLTS_UNIFORMS_FROM_PARTS,
  commanders: COMMANDERS_UNIFORMS,
  cowboys: COWBOYS_UNIFORMS_FROM_PARTS,
  dolphins: DOLPHINS_UNIFORMS,
  '49ers': NINERS_UNIFORMS_FROM_PARTS,
  eagles: EAGLES_UNIFORMS,
  falcons: FALCONS_UNIFORMS_FROM_PARTS,
  giants: GIANTS_UNIFORMS_FROM_PARTS,
  jaguars: JAGUARS_UNIFORMS,
  jets: JETS_UNIFORMS,
  lions: LIONS_UNIFORMS_FROM_PARTS,
  packers: PACKERS_UNIFORMS_FROM_PARTS,
  panthers: PANTHERS_UNIFORMS,
  patriots: PATRIOTS_UNIFORMS,
  raiders: RAIDERS_UNIFORMS_FROM_PARTS,
  rams: RAMS_UNIFORMS,
  ravens: RAVENS_UNIFORMS,
  saints: SAINTS_UNIFORMS_FROM_PARTS,
  seahawks: SEAHAWKS_UNIFORMS_FROM_PARTS,
  steelers: STEELERS_UNIFORMS_FROM_PARTS,
  texans: TEXANS_UNIFORMS_FROM_PARTS,
  titans: TITANS_UNIFORMS_FROM_PARTS,
  vikings: VIKINGS_UNIFORMS,
};

export function getTeamUniformDefinition(teamId: string): TeamUniformDefinition | undefined {
  return Object.hasOwn(DEFINITIONS, teamId) ? DEFINITIONS[teamId] : undefined;
}

export function getAllTeamUniformDefinitions(): Readonly<
  Partial<Record<string, TeamUniformDefinition>>
> {
  return DEFINITIONS;
}
