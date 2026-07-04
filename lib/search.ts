import type { Player, Position, Team, TeamRosterSeed, Unit } from "./types";

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

// Colloquial position-group aliases -> the member positions. Lets a fan search
// "OL" for the whole offensive line, "secondary" for corners + safeties, etc.,
// which the two-letter position codes alone don't express. Keys are normalized
// (lowercased, spaces/hyphens stripped) by positionGroupPositions below.
const POSITION_GROUPS: Record<string, Position[]> = {
  ol: ["LT", "LG", "C", "RG", "RT"],
  oline: ["LT", "LG", "C", "RG", "RT"],
  offensiveline: ["LT", "LG", "C", "RG", "RT"],
  dl: ["DE", "DT"],
  dline: ["DE", "DT"],
  defensiveline: ["DE", "DT"],
  edge: ["DE"],
  db: ["CB", "S"],
  dbs: ["CB", "S"],
  secondary: ["CB", "S"],
  lbs: ["LB"],
  linebackers: ["LB"],
  off: [...OFFENSE_POSITIONS],
  offense: [...OFFENSE_POSITIONS],
  def: [...DEFENSE_POSITIONS],
  defense: [...DEFENSE_POSITIONS],
  st: ["K", "P", "LS"],
  specialteams: ["K", "P", "LS"],
};

// Resolve a position-group query (e.g. "OL", "d-line", "secondary") to its member
// positions, or null when the query isn't a known group.
export function positionGroupPositions(query: string): Position[] | null {
  const key = query.trim().toLowerCase().replace(/[\s-]+/g, "");
  return POSITION_GROUPS[key] ?? null;
}

// A player-search hit that can come from any of the 32 teams (searchAllPlayers,
// lib/roster-source.db.ts), not just the roster already loaded on the client — so it
// carries its own team, unlike a plain roster Player.
export interface PlayerHit {
  id: string;
  name: string;
  number: number;
  position: Position;
  photoUrl?: string;
  college?: string;
  team: Pick<Team, "id" | "city" | "name" | "abbrev">;
}

// Name-prefix hits rank first, then alphabetical — stable and predictable. Shared by
// the single-roster search below and the cross-team DB search, which merges a few
// separately-filtered queries and needs the same final ordering.
export function rankByNameMatch<T extends { name: string }>(hits: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return [...hits].sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name);
  });
}

// Match players by name (substring), college (substring), exact jersey number, or
// exact position. College matching lets a fan pull up, say, every Georgia product.
export function searchPlayers(
  roster: TeamRosterSeed,
  query: string,
  limit = 8,
): Player[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const group = positionGroupPositions(query);
  const groupSet = group ? new Set<Position>(group) : null;

  const matches = roster.players.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.college.toLowerCase().includes(q) ||
      p.position.toLowerCase() === q ||
      String(p.number) === q ||
      (groupSet?.has(p.position) ?? false),
  );
  return rankByNameMatch(matches, q).slice(0, limit);
}
