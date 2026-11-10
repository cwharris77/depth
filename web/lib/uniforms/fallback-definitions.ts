import { getAllTeamUniformDefinitions } from '@/lib/uniforms/teams';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/core/types';

// The archive draws a kit from its definition only when the kit has no committed image, so it
// needs just those teams' definitions; sending all of them inflates the prerendered page.
export function getFallbackUniformDefinitions(
  kits: readonly { teamId: string; imagePath?: string }[]
): Readonly<Partial<Record<string, TeamUniformDefinition>>> {
  const all = getAllTeamUniformDefinitions();
  const definitions: Partial<Record<string, TeamUniformDefinition>> = {};
  for (const { teamId, imagePath } of kits) {
    if (!imagePath && Object.hasOwn(all, teamId)) definitions[teamId] = all[teamId];
  }
  return definitions;
}
