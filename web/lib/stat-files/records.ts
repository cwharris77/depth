// stats_player_week box rows -> league record files (`v1/records/{stat}.json`) and per-player
// highlight files (`v1/players/{espn_id}/highlights.json`). Pure: no fetch, no DB, no
// filesystem.
//
// The files are derived, not source-faithful, and say so: every file carries its scope (regular
// season only), the source it was computed from and the seasons it covers, so a client can
// state a comparator ("since 1999") without inventing a wider one. Playoff games are never
// ranked, and a stat a game lacks is absent, never zero.
//
// A performance is one of two kinds:
//   - a single game, keyed by (player, team, season, week);
//   - a single season with one team, keyed by (player, team, season). A traded player has one
//     season performance per team, matching the career ledger's one-row-per-team rule, so a
//     season mark never adds games played for two clubs together.
//
// Ranks put 1 on the best value and ties share a rank. "Players at or above" counts distinct
// players whose best performance reaches the value, which is what a claim like "only N players
// have done it" needs. A player's all-time rank compares career bests across players; the team
// rank compares each player's best with that team.
//
// Object keys are written in sorted order (the serialization contract: a stable body is what
// lets the publisher skip an unchanged upload).

import type { PlayerWeekRow } from './player-seasons';
import type { GameIndex } from './player-games';

/** Stats with a record file, in sorted order. */
export const RECORD_STATS = [
  'passing_tds',
  'passing_yards',
  'receiving_tds',
  'receiving_yards',
  'rushing_tds',
  'rushing_yards',
] as const;

export type RecordStat = (typeof RECORD_STATS)[number];
export type RecordKind = 'single_game' | 'single_season';

/** The only season type ranked. */
export const RECORD_SEASON_TYPE = 'REG';

/** The source every record is computed from, stated on every file. */
export const RECORD_SOURCE = 'stats_player_week';

/** A league record file lists performances through this rank (ties at the cutoff included). */
export const RECORD_TOP_RANK = 25;

/** Milestones counted per stat and kind, so "only N players" is computed, never estimated. */
export const RECORD_THRESHOLDS: Record<RecordStat, Record<RecordKind, readonly number[]>> = {
  passing_tds: { single_game: [4, 5, 6, 7], single_season: [30, 40, 50] },
  passing_yards: { single_game: [300, 400, 450, 500], single_season: [4000, 5000] },
  receiving_tds: { single_game: [3, 4], single_season: [10, 15] },
  receiving_yards: { single_game: [100, 150, 200, 250], single_season: [1000, 1500, 2000] },
  rushing_tds: { single_game: [3, 4, 5], single_season: [10, 15, 20] },
  rushing_yards: { single_game: [100, 150, 200, 250], single_season: [1000, 1500, 2000] },
};

export type RecordLine = Partial<Record<RecordStat, number>>;

/** One regular-season player-game, as stored in a season checkpoint. Positive stats only. */
export interface RecordGameRow {
  player_id: string;
  season: number;
  week: number;
  team: string | null;
  game_id?: string;
  opponent?: string;
  stats: RecordLine;
}

export interface RecordSeasonCheckpoint {
  schema_version: number;
  season: number;
  rows: RecordGameRow[];
}

function toNumber(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function gameKey(season: number, week: number, team: string): string {
  return `${season}\u0000${week}\u0000${team}`;
}

/**
 * One season's weekly box rows -> regular-season player-games with at least one positive record
 * stat. A week's rows for one (player, team) are summed; `game_id` and `opponent` come from the
 * schedule index, and a week with no schedule match ships without them.
 */
export function toRecordRows(
  season: number,
  boxRows: readonly PlayerWeekRow[],
  index: GameIndex | null
): RecordGameRow[] {
  const groups = new Map<string, RecordGameRow>();
  for (const row of boxRows) {
    if (row.season !== season || row.seasonType !== RECORD_SEASON_TYPE) continue;
    const key = `${row.playerId}\u0000${row.team ?? ''}\u0000${row.week}`;
    const group = groups.get(key) ?? {
      player_id: row.playerId,
      season,
      week: row.week,
      team: row.team,
      stats: {},
    };
    for (const stat of RECORD_STATS) {
      const value = toNumber(row.stats[stat]);
      if (value !== null) group.stats[stat] = (group.stats[stat] ?? 0) + value;
    }
    groups.set(key, group);
  }

  const out: RecordGameRow[] = [];
  for (const group of groups.values()) {
    const stats: RecordLine = {};
    for (const stat of RECORD_STATS) {
      const value = group.stats[stat];
      if (value !== undefined && value > 0) stats[stat] = value;
    }
    if (Object.keys(stats).length === 0) continue;
    const ref = group.team ? index?.get(gameKey(season, group.week, group.team)) : undefined;
    out.push({
      player_id: group.player_id,
      season,
      week: group.week,
      team: group.team,
      ...(ref ? { game_id: ref.game_id, opponent: ref.opponent } : {}),
      stats,
    });
  }
  out.sort(
    (left, right) => left.week - right.week || left.player_id.localeCompare(right.player_id)
  );
  return out;
}

// --- Performances ---------------------------------------------------------------------

interface Performance {
  playerId: string;
  team: string | null;
  season: number;
  week: number | null;
  gameId?: string;
  opponent?: string;
  value: number;
}

function comparePerformances(left: Performance, right: Performance): number {
  return (
    right.value - left.value ||
    left.season - right.season ||
    (left.week ?? 0) - (right.week ?? 0) ||
    left.playerId.localeCompare(right.playerId) ||
    (left.team ?? '').localeCompare(right.team ?? '')
  );
}

/** Every game and every (player, team, season) total for one stat. */
function performancesFor(
  stat: RecordStat,
  rowsBySeason: ReadonlyMap<number, readonly RecordGameRow[]>
): Record<RecordKind, Performance[]> {
  const games: Performance[] = [];
  const seasons: Performance[] = [];
  for (const [season, rows] of rowsBySeason) {
    const totals = new Map<string, Performance>();
    for (const row of rows) {
      const value = row.stats[stat];
      if (value === undefined || value <= 0) continue;
      games.push({
        playerId: row.player_id,
        team: row.team,
        season,
        week: row.week,
        gameId: row.game_id,
        opponent: row.opponent,
        value,
      });
      const key = `${row.player_id}\u0000${row.team ?? ''}`;
      const total = totals.get(key);
      if (total) total.value += value;
      else totals.set(key, { playerId: row.player_id, team: row.team, season, week: null, value });
    }
    seasons.push(...totals.values());
  }
  games.sort(comparePerformances);
  seasons.sort(comparePerformances);
  return { single_game: games, single_season: seasons };
}

/** Each player's best performance, in best-first order. */
function bestPerPlayer(performances: readonly Performance[]): Performance[] {
  const best = new Map<string, Performance>();
  for (const performance of performances) {
    const current = best.get(performance.playerId);
    if (!current || comparePerformances(performance, current) < 0) {
      best.set(performance.playerId, performance);
    }
  }
  return [...best.values()].sort(comparePerformances);
}

/** Rank over best-first values: 1 + how many are strictly better, and how many reach it. */
class Ladder {
  constructor(private readonly values: readonly number[]) {}

  /** `values` must be sorted best (largest) first. */
  rankOf(value: number): number {
    return this.countAbove(value) + 1;
  }

  atOrAbove(value: number): number {
    let low = 0;
    let high = this.values.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.values[mid] >= value) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  private countAbove(value: number): number {
    let low = 0;
    let high = this.values.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.values[mid] > value) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}

// --- League record files --------------------------------------------------------------

export interface RecordCoverage {
  from_season: number;
  to_season: number;
}

export interface RecordEntry {
  game_id?: string;
  opponent?: string;
  player_id: string;
  rank: number;
  season: number;
  team: string | null;
  value: number;
  week?: number;
}

export interface RecordThreshold {
  performances: number;
  players: number;
  value: number;
}

export interface RecordSection {
  thresholds: RecordThreshold[];
  top: RecordEntry[];
}

export interface RecordsFile {
  coverage: RecordCoverage;
  schema_version: number;
  scope: typeof RECORD_SEASON_TYPE;
  single_game: RecordSection;
  single_season: RecordSection;
  source: typeof RECORD_SOURCE;
  stat: RecordStat;
}

function section(
  performances: readonly Performance[],
  thresholds: readonly number[]
): RecordSection {
  const ladder = new Ladder(performances.map((p) => p.value));
  const top: RecordEntry[] = [];
  for (const performance of performances) {
    const rank = ladder.rankOf(performance.value);
    if (rank > RECORD_TOP_RANK) break;
    top.push(entryOf(performance, rank));
  }
  return {
    thresholds: thresholds.map((value) => ({
      performances: ladder.atOrAbove(value),
      players: new Set(
        performances.slice(0, ladder.atOrAbove(value)).map((performance) => performance.playerId)
      ).size,
      value,
    })),
    top,
  };
}

function entryOf(performance: Performance, rank: number): RecordEntry {
  const entry: RecordEntry = {
    player_id: performance.playerId,
    rank,
    season: performance.season,
    team: performance.team,
    value: performance.value,
  };
  if (performance.gameId) entry.game_id = performance.gameId;
  if (performance.opponent) entry.opponent = performance.opponent;
  if (performance.week !== null) entry.week = performance.week;
  return entry;
}

// --- Player highlight files -----------------------------------------------------------

export interface Highlight {
  all_time_rank: number;
  game_id?: string;
  opponent?: string;
  players_at_or_above: number;
  season: number;
  team: string | null;
  team_players_at_or_above?: number;
  team_rank?: number;
  value: number;
  week?: number;
}

export type PlayerHighlights = Partial<Record<RecordStat, Partial<Record<RecordKind, Highlight>>>>;

export interface PlayerHighlightsFile {
  coverage: RecordCoverage;
  highlights: PlayerHighlights;
  player_id: string;
  schema_version: number;
  scope: typeof RECORD_SEASON_TYPE;
  source: typeof RECORD_SOURCE;
}

export interface RecordOutputs {
  records: Map<RecordStat, RecordsFile>;
  highlights: Map<string, PlayerHighlightsFile>;
}

/** Recursively sorts object keys; arrays keep their order. */
export function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)])
    ) as T;
  }
  return value;
}

function teamLadders(bests: readonly Performance[]): Map<string, Ladder> {
  const byTeam = new Map<string, number[]>();
  for (const best of bests) {
    if (!best.team) continue;
    const list = byTeam.get(best.team) ?? [];
    list.push(best.value);
    byTeam.set(best.team, list);
  }
  return new Map(
    [...byTeam].map(([team, values]) => [team, new Ladder(values.sort((a, b) => b - a))])
  );
}

/** A player's best performance with each team, best first. */
function bestPerPlayerTeam(performances: readonly Performance[]): Performance[] {
  const best = new Map<string, Performance>();
  for (const performance of performances) {
    const key = `${performance.playerId}\u0000${performance.team ?? ''}`;
    const current = best.get(key);
    if (!current || comparePerformances(performance, current) < 0) best.set(key, performance);
  }
  return [...best.values()].sort(comparePerformances);
}

/**
 * League record files and per-player highlights from every season's record rows. Pass the
 * whole history: a rank over a partial one would overstate how rare a mark is.
 */
export function buildRecordFiles(
  rowsBySeason: ReadonlyMap<number, readonly RecordGameRow[]>,
  schemaVersion: number
): RecordOutputs {
  const seasons = [...rowsBySeason.keys()].sort((a, b) => a - b);
  const records = new Map<RecordStat, RecordsFile>();
  const highlights = new Map<string, PlayerHighlightsFile>();
  if (seasons.length === 0) return { records, highlights };
  const coverage: RecordCoverage = {
    from_season: seasons[0],
    to_season: seasons[seasons.length - 1],
  };

  for (const stat of RECORD_STATS) {
    const performances = performancesFor(stat, rowsBySeason);
    const sections = {} as Record<RecordKind, RecordSection>;

    for (const kind of ['single_game', 'single_season'] as const) {
      const all = performances[kind];
      sections[kind] = section(all, RECORD_THRESHOLDS[stat][kind]);

      const bests = bestPerPlayer(all);
      const ladder = new Ladder(bests.map((best) => best.value));
      const ladders = teamLadders(bestPerPlayerTeam(all));
      for (const best of bests) {
        const highlight: Highlight = {
          all_time_rank: ladder.rankOf(best.value),
          players_at_or_above: ladder.atOrAbove(best.value),
          season: best.season,
          team: best.team,
          value: best.value,
        };
        if (best.gameId) highlight.game_id = best.gameId;
        if (best.opponent) highlight.opponent = best.opponent;
        if (best.week !== null) highlight.week = best.week;
        const teamLadder = best.team ? ladders.get(best.team) : undefined;
        if (teamLadder) {
          highlight.team_rank = teamLadder.rankOf(best.value);
          highlight.team_players_at_or_above = teamLadder.atOrAbove(best.value);
        }
        const file = highlights.get(best.playerId) ?? {
          coverage,
          highlights: {},
          player_id: best.playerId,
          schema_version: schemaVersion,
          scope: RECORD_SEASON_TYPE,
          source: RECORD_SOURCE,
        };
        (file.highlights[stat] ??= {})[kind] = highlight;
        highlights.set(best.playerId, file);
      }
    }

    records.set(
      stat,
      sortKeys({
        coverage,
        schema_version: schemaVersion,
        scope: RECORD_SEASON_TYPE,
        single_game: sections.single_game,
        single_season: sections.single_season,
        source: RECORD_SOURCE,
        stat,
      })
    );
  }

  for (const [playerId, file] of highlights) highlights.set(playerId, sortKeys(file));
  return { records, highlights };
}
