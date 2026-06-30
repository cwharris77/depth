import type { TeamRoster } from "../types";
import { SEAHAWKS } from "./seahawks";
import { LEAGUE } from "./league";

// Registry of all 32 team rosters. Seahawks is the richer hand-authored example;
// the other 31 are best-effort static placeholders built in lib/teams/league.ts
// (swap for a live ApiRosterSource later).
//
// This module pulls in every team's data, so it must stay server-only — route
// segments resolve a single roster here and pass it to client components as a
// prop. Client components import the registry-free helpers from lib/roster.
export const TEAMS: Record<string, TeamRoster> = {
  seahawks: SEAHAWKS,
  ...Object.fromEntries(LEAGUE.map((roster) => [roster.team.id, roster])),
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
