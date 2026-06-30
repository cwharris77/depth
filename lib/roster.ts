import type { Player, Position, TeamRoster } from "./types";

// Pure roster queries — no dependency on the team registry, so client components
// can import these (and resolveUnit) without bundling every team's data.

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
