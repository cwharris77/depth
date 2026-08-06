import { BEARS_UNIFORMS } from './bears';
import { BENGALS_UNIFORMS } from './bengals';
import { BILLS_UNIFORMS } from './bills';
import { CARDINALS_UNIFORMS } from './cardinals';
import { FALCONS_UNIFORMS } from './falcons';
import { PACKERS_UNIFORMS } from './packers';
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
  cardinals: CARDINALS_UNIFORMS,
  falcons: FALCONS_UNIFORMS,
  packers: PACKERS_UNIFORMS,
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
