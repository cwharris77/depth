import type { TeamRoster } from "../types";
import { SEAHAWKS } from "./seahawks";

// Registry of all team rosters. To add a team:
//   1. Create lib/teams/<team-id>.ts following lib/teams/seahawks.ts
//   2. Import and add it to this map.
//
// This module pulls in every team's data, so it must stay server-only — route
// segments resolve a single roster here and pass it to client components as a
// prop. Client components import the registry-free helpers from lib/roster.
export const TEAMS: Record<string, TeamRoster> = {
  seahawks: SEAHAWKS,
};

export const DEFAULT_TEAM_ID = "seahawks";

export function getTeam(id: string): TeamRoster | undefined {
  return TEAMS[id];
}

export function getActiveTeam(): TeamRoster {
  return TEAMS[DEFAULT_TEAM_ID];
}

// Re-exported for convenience; defined registry-free in lib/roster.
export { getPlayerById, getPlayersByPosition } from "../roster";
