import type { TeamRoster } from "../types";
import { LEAGUE } from "./league";

// Registry of all 32 teams, built from the hand-curated seed in lib/teams/league.ts.
// Its live purpose is seeding team metadata + curated colors (uiAccent/onAccent,
// conference/division) into Postgres via scripts/ingest-espn.mts — ESPN can't
// supply those. The player rosters here are stale placeholders, not a live source;
// the app reads live rosters from the DB (dbRosterSource). See league.ts.
//
// This module pulls in every team's data, so it must stay server-only — route
// segments resolve a single roster here and pass it to client components as a
// prop. Client components import the registry-free helpers from lib/roster.
export const TEAMS: Record<string, TeamRoster> = Object.fromEntries(
  LEAGUE.map((roster) => [roster.team.id, roster]),
);

export const DEFAULT_TEAM_ID = "seahawks";

export function getTeam(id: string): TeamRoster | undefined {
  return TEAMS[id];
}

export function getActiveTeam(): TeamRoster {
  return TEAMS[DEFAULT_TEAM_ID];
}

// Re-exported for convenience; defined registry-free in lib/roster.
export { getPlayerById, getPlayersByPosition } from "../roster";
