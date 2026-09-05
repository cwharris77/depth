import type { Position, Team, Unit } from '@/lib/types';

const OFFENSE_POSITIONS = new Set<Position>([
  'QB',
  'RB',
  'FB',
  'WR',
  'TE',
  'LT',
  'LG',
  'C',
  'RG',
  'RT',
]);
const DEFENSE_POSITIONS = new Set<Position>([
  'DE',
  'LDE',
  'RDE',
  'DT',
  'NT',
  'LB',
  'WLB',
  'LILB',
  'RILB',
  'SLB',
  'CB',
  'LCB',
  'RCB',
  'NB',
  'S',
  'SS',
  'FS',
]);

// The unit a player primarily lines up on, used to jump the field to a search hit
// (e.g. searching a cornerback while viewing offense switches to defense).
export function unitForPosition(position: Position): Unit {
  if (OFFENSE_POSITIONS.has(position)) return 'offense';
  if (DEFENSE_POSITIONS.has(position)) return 'defense';
  return 'special';
}

// Colloquial position-group aliases -> the member positions. Lets a fan search
// "OL" for the whole offensive line, "secondary" for corners + safeties, etc.,
// which the two-letter position codes alone don't express. Keys are normalized
// (lowercased, spaces/hyphens stripped) by positionGroupPositions below.
const POSITION_GROUPS: Record<string, Position[]> = {
  ol: ['LT', 'LG', 'C', 'RG', 'RT', 'OT', 'G'],
  oline: ['LT', 'LG', 'C', 'RG', 'RT', 'OT', 'G'],
  offensiveline: ['LT', 'LG', 'C', 'RG', 'RT', 'OT', 'G'],
  dl: ['DE', 'LDE', 'RDE', 'DT', 'NT'],
  dline: ['DE', 'LDE', 'RDE', 'DT', 'NT'],
  defensiveline: ['DE', 'LDE', 'RDE', 'DT', 'NT'],
  edge: ['DE', 'LDE', 'RDE'],
  db: ['CB', 'LCB', 'RCB', 'NB', 'S', 'SS', 'FS'],
  dbs: ['CB', 'LCB', 'RCB', 'NB', 'S', 'SS', 'FS'],
  secondary: ['CB', 'LCB', 'RCB', 'NB', 'S', 'SS', 'FS'],
  lbs: ['LB', 'WLB', 'LILB', 'RILB', 'SLB'],
  linebackers: ['LB', 'WLB', 'LILB', 'RILB', 'SLB'],
  off: [...OFFENSE_POSITIONS],
  offense: [...OFFENSE_POSITIONS],
  def: [...DEFENSE_POSITIONS],
  defense: [...DEFENSE_POSITIONS],
  st: ['K', 'P', 'LS'],
  specialteams: ['K', 'P', 'LS'],
};

// Resolve a position-group query (e.g. "OL", "d-line", "secondary") to its member
// positions, or null when the query isn't a known group.
export function positionGroupPositions(query: string): Position[] | null {
  const key = query
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '');
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
  team: Pick<Team, 'id' | 'city' | 'name' | 'abbrev'>;
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

// The longest query worth running against Postgres. The player-search route is public
// and unauthenticated, so this caps the LIKE pattern and the cache key: overlong input
// is rejected with 400 by the route (app/api/players/search/route.ts) and returns [] if
// it somehow still reaches searchAllPlayers (lib/roster-source.db.ts).
export const MAX_PLAYER_SEARCH_QUERY_LENGTH = 30;

// Normalize a raw search input for the cache key and the DB LIKE pattern: trim, then
// collapse internal whitespace runs so "geno  smith" and "geno smith" share one cache
// entry and one query. Returns null when the input is empty, whitespace-only, or longer
// than MAX_PLAYER_SEARCH_QUERY_LENGTH — the search route turns null into a 400. Search
// is unauthenticated, so nothing user-supplied may reach Postgres unvetted.
export function normalizePlayerSearchQuery(raw: string): string | null {
  const q = raw.trim().replace(/\s+/g, ' ');
  if (!q || q.length > MAX_PLAYER_SEARCH_QUERY_LENGTH) return null;
  return q;
}

// Escape LIKE wildcards so a query matches literally. Postgres reads %, _ and \ in an
// ILIKE pattern as wildcards/escape, so unescaped input like "100%" would match every
// name that merely starts with "100" instead of a literal percent. Applied to the
// normalized query at every place searchAllPlayers interpolates it into a pattern.
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&');
}
