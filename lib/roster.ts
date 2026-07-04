import type { Player, Position, TeamRosterSeed } from "./types";

// Pure roster queries — no dependency on the team registry, so client components
// can import these (and resolveUnit) without bundling every team's data. They only
// read players, so they take the lighter seed shape (works for full rosters too).

export function getPlayerById(
  roster: TeamRosterSeed,
  id: string,
): Player | undefined {
  return roster.players.find((p) => p.id === id);
}

// Deterministic order: depthRank first, then jersey number as a stable tiebreak.
// Multiple players share a depthRank at a position (e.g. 3 WR1s), so the tiebreak
// is what makes field slot assignment (WR index 0/1/2) reproducible across edits.
export function getPlayersByPosition(
  roster: TeamRosterSeed,
  position: Position,
): Player[] {
  return roster.players
    .filter((p) => p.position === position)
    .sort(
      (a, b) =>
        a.depthRank - b.depthRank || (a.order ?? a.number) - (b.order ?? b.number),
    );
}
