import type { Player, Position, TeamRoster } from "../types";
import { SEAHAWKS } from "./seahawks";

// Registry of all team rosters. To add a team:
//   1. Create lib/teams/<team-id>.ts following lib/teams/seahawks.ts
//   2. Import and add it to this map.
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

export function getPlayerById(
  roster: TeamRoster,
  id: string,
): Player | undefined {
  return roster.players.find((p) => p.id === id);
}

// Deterministic order: depthRank first, then jersey number as a stable tiebreak.
// Multiple players share a depthRank at a position (e.g. 3 WR1s), so the tiebreak
// is what makes field slot assignment (WR index 0/1/2) reproducible across edits.
export function getPlayersByPosition(
  roster: TeamRoster,
  position: Position,
): Player[] {
  return roster.players
    .filter((p) => p.position === position)
    .sort((a, b) => a.depthRank - b.depthRank || a.number - b.number);
}
