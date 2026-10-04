// stats_team_week rows -> one team file (`v1/teams/{team_id}/seasons.json`). Pure: no fetch,
// no DB, no filesystem.
//
// A team's allowed line for a game is its opponent's offensive row for the same game, so the
// source's own columns are enough and no play-by-play fold is needed. The file keeps two
// kinds of values apart:
//   - `games` carries source columns verbatim (offense, and the opponent's offense as
//     `allowed`), with a missing cell omitted, never zero-filled;
//   - `derived` is our own arithmetic over regular-season games only: per-game rates, league
//     ranks per season, and the same over each team's last games.
//
// Ranks put 1 on the team that allowed the least. A team needs at least `MIN_RANK_GAMES`
// games to be ranked, and the denominator (`ranked_teams`) is how many teams were. A
// season total is omitted when any contributing game lacks a field, so a gap reads as absent
// rather than as a smaller number.
//
// Object keys are written in sorted order (the serialization contract: a stable body is what
// lets the publisher skip an unchanged upload).

import { TEAM_WEEK_COLUMNS } from '@/lib/nflverse/source-contract';
import { normalizeSeasonType, type SeasonType, type WeeklyCsvRow } from './player-seasons';

/** Games in a team's recent-form window. */
export const RECENT_WINDOW = 3;

/** Fewest games a team needs before it is ranked, matching the app's thin-sample rule. */
export const MIN_RANK_GAMES = 2;

/** Offensive source columns carried per game, in sorted order. */
export const TEAM_LINE_FIELDS = [
  'attempts',
  'carries',
  'passing_epa',
  'passing_interceptions',
  'passing_tds',
  'passing_yards',
  'rushing_epa',
  'rushing_tds',
  'rushing_yards',
  'sacks_suffered',
] as const satisfies readonly (typeof TEAM_WEEK_COLUMNS)[number][];

export type TeamLineField = (typeof TEAM_LINE_FIELDS)[number];
export type TeamLine = Partial<Record<TeamLineField, number>>;

/** Derived allowed metrics, in sorted order. Every one ranks lowest-allowed first. */
export const ALLOWED_METRICS = [
  'passing_epa',
  'passing_epa_per_dropback',
  'passing_yards',
  'rushing_epa',
  'rushing_epa_per_carry',
  'rushing_yards',
  'total_yards',
] as const;

export type AllowedMetric = (typeof ALLOWED_METRICS)[number];
export type AllowedRates = Partial<Record<AllowedMetric, number>>;
export type AllowedRanks = Partial<Record<AllowedMetric, number>>;

/** One team-game, as stored in a season checkpoint. */
export interface TeamGameRow {
  team: string;
  season: number;
  season_type: SeasonType;
  week: number;
  game_id: string;
  opponent: string;
  offense: TeamLine;
  /** The opponent's offense that game; absent when the source has no paired row. */
  allowed?: TeamLine;
}

export interface TeamGameRowResult {
  rows: TeamGameRow[];
  /** Rows with no usable season, week, game id or team — dropped, never guessed. */
  skipped: number;
  /** Rows whose team or opponent code has no team id — dropped-and-counted. */
  unresolved: number;
}

function toNumber(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function readLine(csv: WeeklyCsvRow): TeamLine {
  const line: TeamLine = {};
  for (const field of TEAM_LINE_FIELDS) {
    const value = toNumber(csv[field]);
    if (value !== null) line[field] = value;
  }
  return line;
}

const SEASON_TYPE_ORDER: Record<SeasonType, number> = { REG: 0, POST: 1 };

/** One season's stats_team_week rows -> team-games, each joined to its opponent's offense. */
export function toTeamGameRows(
  csvRows: WeeklyCsvRow[],
  resolveTeam: (code: string) => string | null
): TeamGameRowResult {
  let skipped = 0;
  let unresolved = 0;
  const parsed: TeamGameRow[] = [];

  for (const csv of csvRows) {
    const season = Number(csv.season?.trim());
    const week = Number(csv.week?.trim());
    const gameId = csv.game_id?.trim();
    const teamCode = csv.team?.trim();
    const opponentCode = csv.opponent_team?.trim();
    if (
      !Number.isInteger(season) ||
      !Number.isInteger(week) ||
      !csv.week?.trim() ||
      !gameId ||
      !teamCode ||
      !opponentCode
    ) {
      skipped++;
      continue;
    }
    const team = resolveTeam(teamCode);
    const opponent = resolveTeam(opponentCode);
    if (!team || !opponent) {
      unresolved++;
      continue;
    }
    parsed.push({
      team,
      season,
      season_type: normalizeSeasonType(csv.season_type),
      week,
      game_id: gameId,
      opponent,
      offense: readLine(csv),
    });
  }

  const offenseByGameTeam = new Map(
    parsed.map((row) => [`${row.game_id}\u0000${row.team}`, row.offense])
  );
  const rows = parsed.map((row) => {
    const allowed = offenseByGameTeam.get(`${row.game_id}\u0000${row.opponent}`);
    return allowed && Object.keys(allowed).length ? { ...row, allowed } : row;
  });
  rows.sort(
    (left, right) =>
      left.team.localeCompare(right.team) ||
      SEASON_TYPE_ORDER[left.season_type] - SEASON_TYPE_ORDER[right.season_type] ||
      left.week - right.week ||
      left.game_id.localeCompare(right.game_id)
  );
  return { rows, skipped, unresolved };
}

export interface TeamSeasonCheckpoint {
  schema_version: number;
  season: number;
  rows: TeamGameRow[];
}

// --- Derived values -------------------------------------------------------------------

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Sum of a field across lines, or null when any line lacks it. */
function total(lines: readonly TeamLine[], field: TeamLineField): number | null {
  let sum = 0;
  for (const line of lines) {
    const value = line[field];
    if (value === undefined) return null;
    sum += value;
  }
  return sum;
}

/** Per-game and per-play allowed rates over a team's allowed lines. */
export function allowedRates(lines: readonly TeamLine[]): AllowedRates {
  const games = lines.length;
  if (games === 0) return {};
  const passYards = total(lines, 'passing_yards');
  const rushYards = total(lines, 'rushing_yards');
  const passEpa = total(lines, 'passing_epa');
  const rushEpa = total(lines, 'rushing_epa');
  const attempts = total(lines, 'attempts');
  const sacks = total(lines, 'sacks_suffered');
  const carries = total(lines, 'carries');
  const dropbacks = attempts !== null && sacks !== null ? attempts + sacks : null;

  const rates: AllowedRates = {};
  if (passEpa !== null) rates.passing_epa = round(passEpa / games);
  if (passEpa !== null && dropbacks) rates.passing_epa_per_dropback = round(passEpa / dropbacks);
  if (passYards !== null) rates.passing_yards = round(passYards / games);
  if (rushEpa !== null) rates.rushing_epa = round(rushEpa / games);
  if (rushEpa !== null && carries) rates.rushing_epa_per_carry = round(rushEpa / carries);
  if (rushYards !== null) rates.rushing_yards = round(rushYards / games);
  if (passYards !== null && rushYards !== null) {
    rates.total_yards = round((passYards + rushYards) / games);
  }
  return rates;
}

interface Window {
  games: number;
  throughWeek: number;
  rates: AllowedRates;
}

/** Ranks per metric (1 = least allowed, ties share a rank) across the teams that have one. */
export function rankAllowed(
  ratesByTeam: ReadonlyMap<string, AllowedRates>
): Map<string, AllowedRanks> {
  const ranks = new Map<string, AllowedRanks>();
  for (const team of ratesByTeam.keys()) ranks.set(team, {});
  for (const metric of ALLOWED_METRICS) {
    const values = [...ratesByTeam].flatMap(([team, rates]) => {
      const value = rates[metric];
      return value === undefined ? [] : [{ team, value }];
    });
    for (const { team, value } of values) {
      const better = values.filter((other) => other.value < value).length;
      const teamRanks = ranks.get(team);
      if (teamRanks) teamRanks[metric] = better + 1;
    }
  }
  return ranks;
}

export interface TeamWindowDerived {
  allowed_per_game: AllowedRates;
  games: number;
  ranked_teams?: number;
  ranks?: AllowedRanks;
  through_week: number;
}

export interface TeamSeasonDerived {
  allowed_per_game: AllowedRates;
  games: number;
  ranked_teams?: number;
  ranks?: AllowedRanks;
  recent?: TeamWindowDerived;
}

export interface TeamFileGame {
  allowed?: TeamLine;
  game_id: string;
  offense?: TeamLine;
  opponent: string;
  season_type: SeasonType;
  week: number;
}

export interface TeamSeasonEntry {
  derived?: TeamSeasonDerived;
  games: TeamFileGame[];
  season: number;
}

export interface TeamSeasonsFile {
  recent_window: number;
  schema_version: number;
  seasons: TeamSeasonEntry[];
  team_id: string;
}

function sortedLine(line: TeamLine): TeamLine {
  const out: TeamLine = {};
  for (const field of TEAM_LINE_FIELDS) if (line[field] !== undefined) out[field] = line[field];
  return out;
}

function fileGame(row: TeamGameRow): TeamFileGame {
  const game: TeamFileGame = {
    game_id: row.game_id,
    opponent: row.opponent,
    season_type: row.season_type,
    week: row.week,
  };
  if (row.allowed) game.allowed = sortedLine(row.allowed);
  if (Object.keys(row.offense).length) game.offense = sortedLine(row.offense);
  return Object.fromEntries(
    Object.entries(game).sort(([a], [b]) => a.localeCompare(b))
  ) as unknown as TeamFileGame;
}

function sortedRates<T extends AllowedRates>(rates: T): T {
  const out: AllowedRates = {};
  for (const metric of ALLOWED_METRICS)
    if (rates[metric] !== undefined) out[metric] = rates[metric];
  return out as T;
}

interface SeasonTeamWindows {
  season: Window | null;
  recent: Window | null;
}

/** A team's regular-season allowed lines, in week order, as the full season and last-N windows. */
function windowsFor(rows: readonly TeamGameRow[]): SeasonTeamWindows {
  const regular = rows
    .filter((row) => row.season_type === 'REG' && row.allowed)
    .sort((left, right) => left.week - right.week);
  const toWindow = (games: readonly TeamGameRow[]): Window | null =>
    games.length === 0
      ? null
      : {
          games: games.length,
          throughWeek: games[games.length - 1].week,
          rates: allowedRates(games.map((game) => game.allowed ?? {})),
        };
  return {
    season: toWindow(regular),
    recent: toWindow(regular.slice(-RECENT_WINDOW)),
  };
}

function rankWindows(
  windows: ReadonlyMap<string, Window | null>
): Map<string, { ranks: AllowedRanks; rankedTeams: number } | null> {
  const eligible = new Map<string, AllowedRates>();
  for (const [team, window] of windows) {
    if (window && window.games >= MIN_RANK_GAMES) eligible.set(team, window.rates);
  }
  const ranks = rankAllowed(eligible);
  return new Map(
    [...windows.keys()].map((team) => {
      const teamRanks = ranks.get(team);
      return [
        team,
        teamRanks && Object.keys(teamRanks).length
          ? { ranks: teamRanks, rankedTeams: eligible.size }
          : null,
      ];
    })
  );
}

/** Derived values for every team in one season. */
function deriveSeason(
  rowsByTeam: ReadonlyMap<string, TeamGameRow[]>
): Map<string, TeamSeasonDerived> {
  const windows = new Map([...rowsByTeam].map(([team, rows]) => [team, windowsFor(rows)] as const));
  const seasonRanks = rankWindows(new Map([...windows].map(([t, w]) => [t, w.season])));
  const recentRanks = rankWindows(new Map([...windows].map(([t, w]) => [t, w.recent])));

  const out = new Map<string, TeamSeasonDerived>();
  for (const [team, window] of windows) {
    if (!window.season) continue;
    const seasonRank = seasonRanks.get(team);
    const derived: TeamSeasonDerived = {
      allowed_per_game: sortedRates(window.season.rates),
      games: window.season.games,
    };
    if (seasonRank) {
      derived.ranked_teams = seasonRank.rankedTeams;
      derived.ranks = sortedRates(seasonRank.ranks);
    }
    if (window.recent && window.recent.games >= MIN_RANK_GAMES) {
      const recent: TeamWindowDerived = {
        allowed_per_game: sortedRates(window.recent.rates),
        games: window.recent.games,
        through_week: window.recent.throughWeek,
      };
      const recentRank = recentRanks.get(team);
      if (recentRank) {
        recent.ranked_teams = recentRank.rankedTeams;
        recent.ranks = sortedRates(recentRank.ranks);
      }
      derived.recent = recent;
    }
    out.set(team, derived);
  }
  return out;
}

function sortedWindow(window: TeamWindowDerived): TeamWindowDerived {
  const out: Partial<TeamWindowDerived> = {};
  out.allowed_per_game = window.allowed_per_game;
  out.games = window.games;
  if (window.ranked_teams !== undefined) out.ranked_teams = window.ranked_teams;
  if (window.ranks) out.ranks = window.ranks;
  out.through_week = window.through_week;
  return out as TeamWindowDerived;
}

function sortedDerived(derived: TeamSeasonDerived): TeamSeasonDerived {
  const out: Partial<TeamSeasonDerived> = {};
  out.allowed_per_game = derived.allowed_per_game;
  out.games = derived.games;
  if (derived.ranked_teams !== undefined) out.ranked_teams = derived.ranked_teams;
  if (derived.ranks) out.ranks = derived.ranks;
  if (derived.recent) out.recent = sortedWindow(derived.recent);
  return out as TeamSeasonDerived;
}

/** Every team's file from the per-season checkpoints, newest season first. */
export function buildTeamFiles(
  rowsBySeason: ReadonlyMap<number, readonly TeamGameRow[]>,
  schemaVersion: number
): Map<string, TeamSeasonsFile> {
  const files = new Map<string, TeamSeasonsFile>();
  for (const season of [...rowsBySeason.keys()].sort((a, b) => b - a)) {
    const rowsByTeam = new Map<string, TeamGameRow[]>();
    for (const row of rowsBySeason.get(season) ?? []) {
      const list = rowsByTeam.get(row.team) ?? [];
      list.push(row);
      rowsByTeam.set(row.team, list);
    }
    const derived = deriveSeason(rowsByTeam);
    for (const [team, rows] of [...rowsByTeam].sort(([a], [b]) => a.localeCompare(b))) {
      const games = [...rows]
        .sort(
          (left, right) =>
            SEASON_TYPE_ORDER[left.season_type] - SEASON_TYPE_ORDER[right.season_type] ||
            left.week - right.week ||
            left.game_id.localeCompare(right.game_id)
        )
        .map(fileGame);
      const teamDerived = derived.get(team);
      const entry: TeamSeasonEntry = teamDerived
        ? { derived: sortedDerived(teamDerived), games, season }
        : { games, season };
      const file = files.get(team) ?? {
        recent_window: RECENT_WINDOW,
        schema_version: schemaVersion,
        seasons: [],
        team_id: team,
      };
      file.seasons.push(entry);
      files.set(team, file);
    }
  }
  return files;
}
