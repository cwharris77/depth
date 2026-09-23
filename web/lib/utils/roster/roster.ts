import type { DepthSeat, Player, Position, TeamRosterSeed } from '@/lib/types';

// Pure roster queries — no dependency on the team registry, so client components
// can import these (and resolveUnit) without bundling every team's data. They only
// read players, so they take the lighter seed shape (works for full rosters too).

export function getPlayerById(roster: TeamRosterSeed, id: string): Player | undefined {
  return roster.players.find((p) => p.id === id);
}

// Deterministic order: depthRank first, then jersey number as a stable tiebreak.
// Multiple players share a depthRank at a position (e.g. 3 WR1s), so the tiebreak
// is what makes field slot assignment (WR index 0/1/2) reproducible across edits.
// Shared by getPlayersByPosition below and lib/utils/depth-chart/formations.ts's
// getPlayersByPositionGroup, which filters by broad group instead of exact position
// but needs the same depth order.
export function byDepthOrder(a: Player, b: Player): number {
  return a.depthRank - b.depthRank || (a.order ?? a.number) - (b.order ?? b.number);
}

// The roster's seats, falling back to one seat per player when there is no depth chart.
//
// The fallback is what keeps historical seasons working: roster_history has no
// depth_chart_entries, so a 2001 roster derives its seats from Player.position and
// Player.depthRank and behaves exactly as it did before seats existed.
export function seatsOf(roster: TeamRosterSeed): DepthSeat[] {
  if (roster.depthChart) return roster.depthChart;
  return roster.players.map((p) => ({
    position: p.position,
    depthRank: p.depthRank,
    playerId: p.id,
  }));
}

// Resolves seats to players, projecting each seat's position and rank onto the athlete
// who fills it.
//
// The projection is the point: one athlete can hold two seats (a swing tackle at LT2 and
// RT1), so the `position`/`depthRank` a caller sees must come from the seat, not from the
// single canonical pair on the player row. Seats whose player is absent from the roster
// are skipped rather than faked.
export function playersInSeats(
  roster: TeamRosterSeed,
  matches: (position: Position) => boolean
): Player[] {
  const byId = new Map(roster.players.map((p) => [p.id, p]));
  const seated: Player[] = [];
  for (const seat of seatsOf(roster)) {
    if (!matches(seat.position)) continue;
    const player = byId.get(seat.playerId);
    if (!player) continue;
    seated.push({ ...player, position: seat.position, depthRank: seat.depthRank });
  }
  return seated.sort(byDepthOrder);
}

export function getPlayersByPosition(roster: TeamRosterSeed, position: Position): Player[] {
  return playersInSeats(roster, (p) => p === position);
}
