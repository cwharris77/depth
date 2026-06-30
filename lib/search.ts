import type { Player, Position, TeamRoster, Unit } from "./types";

const OFFENSE_POSITIONS = new Set<Position>([
  "QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
]);
const DEFENSE_POSITIONS = new Set<Position>([
  "DE", "DT", "LB", "CB", "S",
]);

// The unit a player primarily lines up on, used to jump the field to a search hit
// (e.g. searching a cornerback while viewing offense switches to defense).
export function unitForPosition(position: Position): Unit {
  if (OFFENSE_POSITIONS.has(position)) return "offense";
  if (DEFENSE_POSITIONS.has(position)) return "defense";
  return "special";
}

// Match players by name (substring), exact jersey number, or exact position.
// Name-prefix hits rank first, then alphabetical — stable and predictable.
export function searchPlayers(
  roster: TeamRoster,
  query: string,
  limit = 8,
): Player[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return roster.players
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase() === q ||
        String(p.number) === q,
    )
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
