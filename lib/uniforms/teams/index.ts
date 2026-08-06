import { BENGALS_UNIFORMS } from './bengals';
import { BILLS_UNIFORMS } from './bills';
import { SEAHAWKS_UNIFORMS } from './seahawks';
import type { TeamUniformDefinition } from './types';

// Server-boundary registry for team construction definitions. Client team pages receive only the
// selected definition instead of importing every team's geometry into their bundle.

const DEFINITIONS: Readonly<Partial<Record<string, TeamUniformDefinition>>> = {
  bengals: BENGALS_UNIFORMS,
  bills: BILLS_UNIFORMS,
  seahawks: SEAHAWKS_UNIFORMS,
};

export function getTeamUniformDefinition(teamId: string): TeamUniformDefinition | undefined {
  return Object.hasOwn(DEFINITIONS, teamId) ? DEFINITIONS[teamId] : undefined;
}

export function getAllTeamUniformDefinitions(): Readonly<
  Partial<Record<string, TeamUniformDefinition>>
> {
  return DEFINITIONS;
}
