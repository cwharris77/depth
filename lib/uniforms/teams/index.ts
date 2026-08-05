import { BENGALS_UNIFORMS } from './bengals';
import { BILLS_UNIFORMS } from './bills';
import type { TeamUniformDefinition } from './types';

// Server-boundary registry for team construction definitions. Client team pages receive only the
// selected definition instead of importing every team's geometry into their bundle.

const DEFINITIONS = {
  bengals: BENGALS_UNIFORMS,
  bills: BILLS_UNIFORMS,
} satisfies Record<string, TeamUniformDefinition>;

export function getTeamUniformDefinition(teamId: string) {
  return DEFINITIONS[teamId as keyof typeof DEFINITIONS];
}

export function getAllTeamUniformDefinitions() {
  return DEFINITIONS;
}
