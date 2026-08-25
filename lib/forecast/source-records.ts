// Parses nflverse forecast inputs into a deliberately narrow, forecast-only boundary.
// Blank context and feature cells stay null so later layers can diagnose or fall back per
// feature; malformed source identities are excluded here instead of being guessed.

import { resolveTeamCode } from '@/lib/nflverse/team-codes';
import { vigFreeImpliedProbability } from '@/lib/utils/compare/market-lines';
import { SOURCE_SEASONS } from './contracts';

export interface ForecastGame {
  gameId: string;
  season: number;
  week: number;
  seasonType: 'REG' | 'POST';
  kickoffKey: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeRest: number | null;
  awayRest: number | null;
  neutralSite: boolean;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  marketHomeProbability: number | null;
}

export interface WeeklyTeamStat {
  gameId: string;
  season: number;
  week: number;
  seasonType: 'REG' | 'POST';
  teamId: string;
  opponentTeamId: string;
  attempts: number | null;
  sacksSuffered: number | null;
  passingEpa: number | null;
  passingInterceptions: number | null;
  passing20: number | null;
  carries: number | null;
  rushingEpa: number | null;
  rushing20: number | null;
  defensiveSacks: number | null;
  defensiveInterceptions: number | null;
  opponentFumbleRecoveries: number | null;
  fumblesLost: number | null;
}

export interface ParsedForecastGames {
  games: ForecastGame[];
  malformedGames: number;
}

export interface ParsedWeeklyTeamStats {
  teamStats: WeeklyTeamStat[];
  malformedTeamRows: number;
}

export interface SourceAudit {
  ok: boolean;
  gameCountBySeason: Record<string, number>;
  teamRowCountBySeason: Record<string, number>;
  missingGameFields: string[];
  missingWeeklyFieldsBySeason: Record<string, string[]>;
  malformedGames: number;
  malformedTeamRowsBySeason: Record<string, number>;
}

const GAME_REQUIRED_FIELDS = [
  'game_id',
  'season',
  'week',
  'game_type',
  'gameday',
  'gametime',
  'home_team',
  'away_team',
  'home_score',
  'away_score',
  'home_rest',
  'away_rest',
  'location',
  'home_moneyline',
  'away_moneyline',
] as const;

const REQUIRED_WEEKLY_FIELDS = [
  'season',
  'week',
  'team',
  'season_type',
  'game_id',
  'opponent_team',
  'attempts',
  'sacks_suffered',
  'passing_epa',
  'passing_interceptions',
  'passing_20',
  'carries',
  'rushing_epa',
  'rushing_20',
  'def_sacks',
  'def_interceptions',
  'fumble_recovery_opp',
  'fumbles_lost_total',
] as const;

const SOURCE_SEASON_SET = new Set<number>(SOURCE_SEASONS);

function hasFields(row: Record<string, string>, fields: readonly string[]): boolean {
  return fields.every((field) => Object.hasOwn(row, field));
}

function text(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function finiteNumber(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function finiteInteger(value: string | undefined): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed !== undefined && Number.isInteger(parsed) ? parsed : null;
}

function seasonType(value: string | undefined): 'REG' | 'POST' | null {
  const parsed = text(value);
  return parsed === 'REG' || parsed === 'POST' ? parsed : null;
}

function missingFields(rows: Record<string, string>[], fields: readonly string[]): string[] {
  const headers = new Set(Object.keys(rows[0] ?? {}));
  return fields.filter((field) => !headers.has(field));
}

export function parseForecastGames(rows: Record<string, string>[]): ParsedForecastGames {
  const games: ForecastGame[] = [];
  let malformedGames = 0;

  for (const row of rows) {
    const season = finiteInteger(row.season);
    const week = finiteInteger(row.week);
    const gameId = text(row.game_id);
    const gameSeasonType = seasonType(row.game_type);
    const gameday = text(row.gameday);
    const gametime = text(row.gametime);
    const location = text(row.location);
    const homeTeamId = resolveTeamCode(text(row.home_team) ?? '');
    const awayTeamId = resolveTeamCode(text(row.away_team) ?? '');
    const homeScore = finiteNumber(row.home_score);
    const awayScore = finiteNumber(row.away_score);
    const homeRest = finiteNumber(row.home_rest);
    const awayRest = finiteNumber(row.away_rest);
    const homeMoneyline = finiteNumber(row.home_moneyline);
    const awayMoneyline = finiteNumber(row.away_moneyline);

    // games.csv predates the forecast window. Those complete, out-of-scope rows are
    // neither evidence nor malformed forecast input, so they cannot make the audit fail.
    if (season !== null && !SOURCE_SEASON_SET.has(season)) continue;

    if (
      !hasFields(row, GAME_REQUIRED_FIELDS) ||
      season === null ||
      week === null ||
      !gameId ||
      !gameSeasonType ||
      !gameday ||
      !gametime ||
      !homeTeamId ||
      !awayTeamId ||
      (location !== 'Home' && location !== 'Neutral') ||
      homeScore === undefined ||
      awayScore === undefined ||
      homeRest === undefined ||
      awayRest === undefined ||
      homeMoneyline === undefined ||
      awayMoneyline === undefined
    ) {
      malformedGames++;
      continue;
    }

    games.push({
      gameId,
      season,
      week,
      seasonType: gameSeasonType,
      kickoffKey: `${gameday}T${gametime}`,
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      homeRest,
      awayRest,
      neutralSite: location === 'Neutral',
      homeMoneyline,
      awayMoneyline,
      marketHomeProbability: vigFreeImpliedProbability(homeMoneyline, awayMoneyline),
    });
  }

  games.sort(
    (a, b) => a.kickoffKey.localeCompare(b.kickoffKey) || a.gameId.localeCompare(b.gameId)
  );
  return { games, malformedGames };
}

export function parseWeeklyTeamStats(
  rows: Record<string, string>[],
  expectedSeason: number
): ParsedWeeklyTeamStats {
  const parsedRows: WeeklyTeamStat[] = [];
  let malformedTeamRows = 0;

  for (const row of rows) {
    const season = finiteInteger(row.season);
    const week = finiteInteger(row.week);
    const gameId = text(row.game_id);
    const rowSeasonType = seasonType(row.season_type);
    const teamId = resolveTeamCode(text(row.team) ?? '');
    const opponentTeamId = resolveTeamCode(text(row.opponent_team) ?? '');
    const values = REQUIRED_WEEKLY_FIELDS.slice(6).map((field) => finiteNumber(row[field]));

    if (
      !hasFields(row, REQUIRED_WEEKLY_FIELDS) ||
      season === null ||
      season !== expectedSeason ||
      week === null ||
      !gameId ||
      !rowSeasonType ||
      !teamId ||
      !opponentTeamId ||
      values.some((value) => value === undefined)
    ) {
      malformedTeamRows++;
      continue;
    }

    const [
      attempts,
      sacksSuffered,
      passingEpa,
      passingInterceptions,
      passing20,
      carries,
      rushingEpa,
      rushing20,
      defensiveSacks,
      defensiveInterceptions,
      opponentFumbleRecoveries,
      fumblesLost,
    ] = values as Array<number | null>;

    parsedRows.push({
      gameId,
      season,
      week,
      seasonType: rowSeasonType,
      teamId,
      opponentTeamId,
      attempts,
      sacksSuffered,
      passingEpa,
      passingInterceptions,
      passing20,
      carries,
      rushingEpa,
      rushing20,
      defensiveSacks,
      defensiveInterceptions,
      opponentFumbleRecoveries,
      fumblesLost,
    });
  }

  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  for (const row of parsedRows) {
    const key = `${row.gameId}|${row.teamId}`;
    if (seenKeys.has(key)) duplicateKeys.add(key);
    seenKeys.add(key);
  }
  const teamStats = parsedRows.filter((row) => {
    const duplicate = duplicateKeys.has(`${row.gameId}|${row.teamId}`);
    if (duplicate) malformedTeamRows++;
    return !duplicate;
  });

  teamStats.sort(
    (a, b) =>
      a.season - b.season ||
      a.week - b.week ||
      a.gameId.localeCompare(b.gameId) ||
      a.teamId.localeCompare(b.teamId)
  );
  return { teamStats, malformedTeamRows };
}

function validWeeklyPair(rows: WeeklyTeamStat[], gamesById: Map<string, ForecastGame>): boolean {
  if (rows.length !== 2) return false;
  const [first, second] = rows;
  const game = gamesById.get(first.gameId);
  return (
    first.opponentTeamId === second.teamId &&
    second.opponentTeamId === first.teamId &&
    first.season === second.season &&
    first.seasonType === second.seasonType &&
    game !== undefined &&
    game.season === first.season &&
    new Set([game.homeTeamId, game.awayTeamId]).size === 2 &&
    new Set([first.teamId, first.opponentTeamId]).size === 2 &&
    [game.homeTeamId, game.awayTeamId].includes(first.teamId) &&
    [game.homeTeamId, game.awayTeamId].includes(first.opponentTeamId)
  );
}

export function auditForecastSources(
  gamesRows: Record<string, string>[],
  teamRowsBySeason: Record<string, Record<string, string>[]>
): SourceAudit {
  const parsedGames = parseForecastGames(gamesRows);
  const gameCountBySeason: Record<string, number> = {};
  for (const game of parsedGames.games) {
    const key = String(game.season);
    gameCountBySeason[key] = (gameCountBySeason[key] ?? 0) + 1;
  }
  const gamesById = new Map(parsedGames.games.map((game) => [game.gameId, game]));

  const teamRowCountBySeason: Record<string, number> = {};
  const missingWeeklyFieldsBySeason: Record<string, string[]> = {};
  const malformedTeamRowsBySeason: Record<string, number> = {};

  for (const [seasonKey, sourceRows] of Object.entries(teamRowsBySeason)) {
    const expectedSeason = Number(seasonKey);
    const parsed = parseWeeklyTeamStats(sourceRows, expectedSeason);
    const byGameId = new Map<string, WeeklyTeamStat[]>();
    for (const row of parsed.teamStats) {
      const gameRows = byGameId.get(row.gameId) ?? [];
      gameRows.push(row);
      byGameId.set(row.gameId, gameRows);
    }

    const malformedPairRows = new Set<string>();
    for (const [gameId, rows] of byGameId) {
      if (!validWeeklyPair(rows, gamesById)) {
        for (const row of rows) malformedPairRows.add(`${gameId}|${row.teamId}`);
      }
    }
    const validRows = parsed.teamStats.filter(
      (row) => !malformedPairRows.has(`${row.gameId}|${row.teamId}`)
    );

    teamRowCountBySeason[seasonKey] = validRows.length;
    missingWeeklyFieldsBySeason[seasonKey] = missingFields(sourceRows, REQUIRED_WEEKLY_FIELDS);
    malformedTeamRowsBySeason[seasonKey] = parsed.malformedTeamRows + malformedPairRows.size;
  }

  const missingGameFields = missingFields(gamesRows, GAME_REQUIRED_FIELDS);
  const requestedSeasons = Object.keys(teamRowsBySeason);
  const hasEmptyRequestedSeason = requestedSeasons.some(
    (season) => (gameCountBySeason[season] ?? 0) === 0 || (teamRowCountBySeason[season] ?? 0) === 0
  );
  const hasMissingFields =
    missingGameFields.length > 0 ||
    Object.values(missingWeeklyFieldsBySeason).some((fields) => fields.length > 0);
  const hasMalformedRows =
    parsedGames.malformedGames > 0 ||
    Object.values(malformedTeamRowsBySeason).some((count) => count > 0);

  return {
    ok: !hasMissingFields && !hasEmptyRequestedSeason && !hasMalformedRows,
    gameCountBySeason,
    teamRowCountBySeason,
    missingGameFields,
    missingWeeklyFieldsBySeason,
    malformedGames: parsedGames.malformedGames,
    malformedTeamRowsBySeason,
  };
}
