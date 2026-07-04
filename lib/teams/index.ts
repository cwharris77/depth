import type { TeamRosterSeed } from "../types";
import { LEAGUE } from "./league";

// Registry of all 32 team identities, built from the seed in lib/teams/league.ts. It's a
// build-time seed the ESPN ingestion loops over (scripts/ingest-espn.mts) — colors,
// conference/division, and rosters all come from ESPN, not here. The player entries in the
// seed are stale placeholders (tests use them as fixtures), not a live source; the app
// reads live data from the DB (dbRosterSource). See league.ts.
export const TEAMS: Record<string, TeamRosterSeed> = Object.fromEntries(
  LEAGUE.map((roster) => [roster.team.id, roster]),
);

export const DEFAULT_TEAM_ID = "seahawks";

export function getTeam(id: string): TeamRosterSeed | undefined {
  return TEAMS[id];
}

export function getActiveTeam(): TeamRosterSeed {
  return TEAMS[DEFAULT_TEAM_ID];
}

// Re-exported for convenience; defined registry-free in lib/roster.
export { getPlayerById, getPlayersByPosition } from "../roster";
