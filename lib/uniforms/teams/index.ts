import { BEARS_UNIFORMS } from './bears';
import { BENGALS_UNIFORMS } from './bengals';

import { BILLS_UNIFORMS } from './bills';
import { BROWNS_UNIFORMS } from './browns';
import { CARDINALS_UNIFORMS } from './cardinals';
import { CHIEFS_UNIFORMS } from './chiefs';
import { COLTS_UNIFORMS } from './colts';
import { COWBOYS_UNIFORMS } from './cowboys';
import { FALCONS_UNIFORMS } from './falcons';
import { GIANTS_UNIFORMS } from './giants';
import { NINERS_UNIFORMS } from './niners';
import { PACKERS_UNIFORMS } from './packers';
import { RAMS_UNIFORMS } from './rams';
import { SAINTS_UNIFORMS } from './saints';
import { SEAHAWKS_UNIFORMS } from './seahawks';
import { STEELERS_UNIFORMS } from './steelers';
import { VIKINGS_UNIFORMS } from './vikings';
import type { TeamUniformDefinition } from './types';

// Server-boundary registry for team construction definitions. Client team pages receive only the
// selected definition instead of importing every team's geometry into their bundle.

const DEFINITIONS: Readonly<Partial<Record<string, TeamUniformDefinition>>> = {
  bears: BEARS_UNIFORMS,
  bengals: BENGALS_UNIFORMS,
  bills: BILLS_UNIFORMS,
  browns: BROWNS_UNIFORMS,
  cardinals: CARDINALS_UNIFORMS,
  chiefs: CHIEFS_UNIFORMS,
  colts: COLTS_UNIFORMS,
  cowboys: COWBOYS_UNIFORMS,
  '49ers': NINERS_UNIFORMS,
  falcons: FALCONS_UNIFORMS,
  giants: GIANTS_UNIFORMS,
  packers: PACKERS_UNIFORMS,
  rams: RAMS_UNIFORMS,
  saints: SAINTS_UNIFORMS,
  seahawks: SEAHAWKS_UNIFORMS,
  steelers: STEELERS_UNIFORMS,
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
