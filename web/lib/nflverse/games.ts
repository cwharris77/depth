// Turns nflverse's nfldata/games.csv rows into `games` + `schedules` upsert rows. Pure:
// no fetch, no DB. Each CSV row is one shared game (home + away on a single row); it
// becomes one game row and contributes a schedule row for each team's (team, season) —
// the ingest upserts schedules first so the games' composite FKs resolve. A row whose home
// or away code doesn't crosswalk (resolveCode -> null), whose season isn't a number, or that
// has no game_id is dropped with a reason -- never guessed, same posture as the player-stats
// transform.
//
// games.csv is nfldata's single schedule/results file covering every season since 1999
// (unlike the player-stats CSVs, there's no per-season asset to scope the fetch to) --
// so scoping happens after parsing. By default only the two most recent seasons found
// in the file are kept, mirroring the "current + previous season" rule the player-stats
// ingest already applies; an explicit `minSeason` (the historic-backfill script's
// --seasons flag) overrides that and keeps everything from that season
// on. Older rows are dropped as `out_of_scope_season`, a reason distinct from the malformed
// ones.
//
// Conservation: every CSV row is either one game row or one drop. Schedule rows are derived
// from the kept games (deduplicated per team-season), so they are not counted against the
// input.
import type { Drop } from '../utils/ingest/drops';

export type GameDropReason =
  'invalid_season' | 'missing_game_id' | 'unknown_team' | 'out_of_scope_season';

export interface ScheduleInsert {
  team_id: string;
  season: number;
}

export interface GameInsert {
  game_id: string;
  season: number;
  game_type: string;
  week: number | null;
  gameday: string | null;
  gametime: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  location: string | null;
  away_moneyline: number | null;
  home_moneyline: number | null;
  spread_line: number | null;
  away_spread_odds: number | null;
  home_spread_odds: number | null;
  total_line: number | null;
  under_odds: number | null;
  over_odds: number | null;
  market_updated_at: string | null;
}

// '' -> null (nflverse's blank-cell convention, e.g. an unplayed game's score or a
// far-future game's date), else Number(...); a malformed numeric cell degrades to null
// rather than throwing.
function nullableInt(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

// Market spreads and totals may be half-points, while American odds are normally
// integers. Preserve either as finite numbers and degrade malformed source cells to
// null so one bad line never drops the schedule row.
function nullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nullableText(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function toScheduleAndGameRows(
  csvRows: Record<string, string>[],
  resolveCode: (code: string) => string | null,
  minSeason?: number,
  marketUpdatedAt?: string
): { games: GameInsert[]; schedules: ScheduleInsert[]; dropped: Drop<GameDropReason>[] } {
  const parsed: GameInsert[] = [];
  const dropped: Drop<GameDropReason>[] = [];

  for (const [index, row] of csvRows.entries()) {
    const gameId = row.game_id?.trim() ?? '';
    const key = gameId || `row:${index}`;
    // Guard the empty string explicitly: Number('') is 0, not NaN, so a blank season would
    // otherwise slip through as year 0.
    const seasonRaw = row.season?.trim() ?? '';
    const season = Number(seasonRaw);
    if (seasonRaw === '' || !Number.isInteger(season)) {
      dropped.push({ reason: 'invalid_season', key, value: seasonRaw });
      continue;
    }
    if (!gameId) {
      dropped.push({ reason: 'missing_game_id', key });
      continue;
    }
    const homeCode = row.home_team?.trim() ?? '';
    const awayCode = row.away_team?.trim() ?? '';
    const homeId = resolveCode(homeCode);
    const awayId = resolveCode(awayCode);
    if (!homeId || !awayId) {
      dropped.push({ reason: 'unknown_team', key, value: homeId ? awayCode : homeCode });
      continue;
    }

    const market = {
      away_moneyline: nullableNumber(row.away_moneyline),
      home_moneyline: nullableNumber(row.home_moneyline),
      spread_line: nullableNumber(row.spread_line),
      away_spread_odds: nullableNumber(row.away_spread_odds),
      home_spread_odds: nullableNumber(row.home_spread_odds),
      total_line: nullableNumber(row.total_line),
      under_odds: nullableNumber(row.under_odds),
      over_odds: nullableNumber(row.over_odds),
    };
    const hasMarket = Object.values(market).some((value) => value !== null);

    parsed.push({
      game_id: gameId,
      season,
      game_type: row.game_type?.trim() || 'REG',
      week: nullableInt(row.week),
      gameday: nullableText(row.gameday),
      gametime: nullableText(row.gametime),
      home_team_id: homeId,
      away_team_id: awayId,
      home_score: nullableInt(row.home_score),
      away_score: nullableInt(row.away_score),
      location: nullableText(row.location),
      ...market,
      // nflverse exposes the current observed line, not a bookmaker timestamp. This
      // records when Depth observed a posted market row so consumers can identify stale
      // data without claiming a more precise source time than exists.
      market_updated_at: hasMarket ? (marketUpdatedAt ?? null) : null,
    });
  }

  // Default: the two most recent seasons present in the file (current + previous),
  // same rule as the player-stats ingest. Computed from the data itself rather than
  // the calendar so a mid-offseason run (next season's games not yet in the file
  // either) still keeps the two seasons that do exist. An explicit minSeason (backfill
  // mode) overrides this and keeps every season from there on.
  const maxSeason = parsed.reduce((max, g) => Math.max(max, g.season), -Infinity);
  const floor = minSeason ?? maxSeason - 1;
  const games: GameInsert[] = [];
  for (const g of parsed) {
    if (g.season >= floor) games.push(g);
    else dropped.push({ reason: 'out_of_scope_season', key: g.game_id, value: String(g.season) });
  }

  const scheduleKeys = new Set<string>(); // `${team_id}|${season}`, dedup across a team's games
  for (const g of games) {
    scheduleKeys.add(`${g.home_team_id}|${g.season}`);
    scheduleKeys.add(`${g.away_team_id}|${g.season}`);
  }

  // Stable order (team then season) so a rerun writes the same batch — nice for
  // idempotent upserts and deterministic tests.
  const schedules: ScheduleInsert[] = [...scheduleKeys]
    .map((key) => {
      const [team_id, season] = key.split('|');
      return { team_id, season: Number(season) };
    })
    .sort((a, b) => a.team_id.localeCompare(b.team_id) || a.season - b.season);

  return { games, schedules, dropped };
}
