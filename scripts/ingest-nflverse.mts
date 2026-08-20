// Fetches nflverse's player id crosswalk + the latest two seasons of player season
// stats, transforms them through the pure lib/nflverse pipeline, and upserts into
// Postgres (Supabase). Run by hand (or on a schedule -- see docs/nflverse.md). Never
// part of `next build`.
//
// Usage:
//   npm run ingest:nflverse                     # daily job: player_stats current +
//                                                # previous season, games/schedules
//                                                # current + previous season
//   npm run ingest:nflverse -- --seasons 1999-2025
//     backfills games/schedules/team_season_stats/player_stats for every season in the
//     range (docs/nflverse.md). player_stats widens its gate for this flag -- a row
//     writes on a crosswalk match alone, not requiring current-roster membership (see
//     docs/superpowers/specs/2026-08-13-player-stats-historic-identity-design.md for
//     why).
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY in the environment (secret key
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).
//
// Seed mode: `npm run gen:nflverse-seed` sets SEED_OUT=supabase/seed-nflverse.sql,
// which fetches + transforms exactly the same way but writes a committed seed script
// instead of touching the DB (no Supabase creds needed) -- mirrors ingest-espn.mts's
// SEED_OUT mode. Always current + previous season / latest formations season only, same
// as the daily job; the --seasons backfill flag isn't meaningful for a local dev seed.
// player_stats FKs to `players`, which this mode can't query live -- it instead reads
// the already-committed ESPN seed (supabase/seed.sql) for known player ids, so run
// `npm run gen:espn-seed` first. `supabase db reset` then restores nflverse data
// offline, so contributors don't have to run the live ingest after every reset.

import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';

dotenv.config({ path: '.env.local' });
import { parseCsv, parseCsvStream } from '@/lib/nflverse/csv';
import { assetUrl, latestAvailableSeason } from '@/lib/nflverse/assets';
import { buildCrosswalk } from '@/lib/nflverse/crosswalk';
import { toPlayerStatsRows, type PlayerStatsInsert } from '@/lib/nflverse/transform';
import { toScheduleAndGameRows, type GameInsert, type ScheduleInsert } from '@/lib/nflverse/games';
import { toTeamStatsRows, type TeamStatsInsert } from '@/lib/nflverse/team-stats';
import { FormationAccumulator, type ParticipationRow } from '@/lib/nflverse/participation';
import { DefenseFormationAccumulator } from '@/lib/nflverse/defense-participation';
import { resolveTeamCode } from '@/lib/nflverse/team-codes';
import { parseSeasonsArg } from '@/lib/nflverse/seasons-arg';
import { SEASONS_MIN } from '@/lib/nflverse/roster-history';
import {
  extractPlayerIds,
  buildPlayerStatsSeedSql,
  buildSchedulesAndGamesSeedSql,
  buildTeamFormationsSeedSql,
  buildTeamStatsSeedSql,
  type UnitFormationTally,
} from '@/lib/nflverse/seed-sql';
import type { Database } from '@/lib/database.types';

const PLAYERS_TAG = 'players';
const PLAYERS_FILE = 'players.csv';
// nflverse renamed this release tag from `player_stats` to `stats_player` after the 2024
// season (asset filenames are unchanged). The old tag stopped getting new season assets, so
// `latestAvailableSeason` silently capped out at 2024 with no error -- no STRICT failure, just
// a season that never got ingested. See docs/nflverse.md.
const STATS_TAG = 'stats_player';
const STATS_PREFIX = 'stats_player_reg_';
// The schedule/results file lives in nfldata (one CSV, every season 1999+), not the
// season-suffixed nflverse-data release assets -- so it has its own raw URL, not assetUrl.
const GAMES_URL = 'https://github.com/nflverse/nfldata/raw/master/data/games.csv';
// Supabase upsert payload cap: games is ~7.5k rows, chunk it so one call doesn't time out.
const UPSERT_CHUNK = 1000;
// Real per-team formations (docs/superpowers/specs/2026-07-07-phase-e-real-formations-
// design.md). v1 only handles the FTN-charted vocabulary (2023+), so only the latest
// available season is ever pulled -- the older NGS-sourced seasons use a different,
// finer formation vocabulary this repo doesn't parse.
const PARTICIPATION_TAG = 'pbp_participation';
const PARTICIPATION_PREFIX = 'pbp_participation_';
// Team season stats — one row per (team, season), full 131-column stat line.
// Asset naming mirrors the player-stats convention: stats_team_reg_<season>.csv.
const TEAM_STATS_TAG = 'stats_team';
const TEAM_STATS_PREFIX = 'stats_team_reg_';
// SEED_OUT mode has no live `players` table to query -- it reads known player ids from
// this already-committed file instead (see the header comment above).
const ESPN_SEED_PATH = 'supabase/seed.sql';

// nflverse's CSV assets are stable, but a GitHub release download can blip like any
// other network call -- retry a few times with backoff rather than failing the whole
// run on one flaky fetch (same shape as ingest-espn.mts's getJson).
async function getText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

// Fetch + transform the nflverse schedule/results file (pure), then upsert schedules
// (the per-team-season anchor) then games -- schedules first so the games' composite FKs
// resolve. `supabase === null` (SEED_OUT mode) skips the writes and only returns the
// computed rows. Idempotent upserts (conflict on the PKs), so a rerun is always safe.
// `minSeason` is undefined for the daily job (current + previous, the default inside
// toScheduleAndGameRows) or an explicit floor for a --seasons backfill run.
async function ingestGames(
  supabase: SupabaseClient<Database> | null,
  minSeason?: number
): Promise<{
  schedules: ScheduleInsert[];
  games: GameInsert[];
  skipped: number;
  failure: string | null;
}> {
  try {
    const csv = await getText(GAMES_URL);
    const { games, schedules, skipped } = toScheduleAndGameRows(
      parseCsv(csv),
      resolveTeamCode,
      minSeason
    );

    if (supabase) {
      const { error: schedError } = await supabase
        .from('schedules')
        .upsert(schedules, { onConflict: 'team_id,season' });
      if (schedError) throw new Error(`schedules upsert: ${schedError.message}`);

      for (let i = 0; i < games.length; i += UPSERT_CHUNK) {
        const chunk = games.slice(i, i + UPSERT_CHUNK);
        const { error } = await supabase.from('games').upsert(chunk, { onConflict: 'game_id' });
        if (error) throw new Error(`games upsert: ${error.message}`);
      }
    }

    console.log(
      `games: ${supabase ? 'wrote' : 'computed'} ${games.length} games, ${schedules.length} schedules, skipped ${skipped}`
    );
    return { schedules, games, skipped, failure: null };
  } catch (e) {
    return { schedules: [], games: [], skipped: 0, failure: (e as Error).message };
  }
}

// Adapts a fetch Response body (a web ReadableStream<Uint8Array>) into the async text
// chunks parseCsvStream wants. `stream: true` lets TextDecoder hold back a partial
// multi-byte UTF-8 sequence split across chunk boundaries, decoding it once the rest
// arrives instead of corrupting it.
async function* textChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      const tail = decoder.decode();
      if (tail) yield tail;
      return;
    }
    yield decoder.decode(value, { stream: true });
  }
}

// A team's real (played) game count -- the coverage check's denominator
// (lib/nflverse/participation.ts). A game with no score yet isn't "coverage", it's just
// unplayed. Shared by both the live path (queries the full `games` table, already
// season-filtered) and SEED_OUT mode (this run's freshly computed games, filtered here).
function countGamesPlayed(
  rows: { home_team_id: string; away_team_id: string; home_score: number | null }[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.home_score === null) continue;
    counts.set(row.home_team_id, (counts.get(row.home_team_id) ?? 0) + 1);
    counts.set(row.away_team_id, (counts.get(row.away_team_id) ?? 0) + 1);
  }
  return counts;
}

async function getGamesPlayedByTeamDb(
  supabase: SupabaseClient<Database>,
  season: number
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('games')
    .select('home_team_id, away_team_id, home_score')
    .eq('season', season);
  if (error) throw new Error(`games query failed: ${error.message}`);
  return countGamesPlayed(data ?? []);
}

function gamesPlayedByTeamFromGames(games: GameInsert[], season: number): Map<string, number> {
  return countGamesPlayed(games.filter((g) => g.season === season));
}

// Fetches the latest available pbp_participation season and stream-parses it straight
// into both a FormationAccumulator and a DefenseFormationAccumulator in the same pass
// (locked decision: never materialize the ~46k-row season file in memory, and never
// fetch/parse the ~50MB file twice for two units), then upserts every (alignment,
// personnel) combo the team ran per unit (DEP-141: no top-N cap). A team below the
// coverage bar simply gets no rows for that unit -- the field view falls back to the
// generic formation for it, never a sparse-sample layout. `getGamesPlayedByTeam` is
// injected so the live path can query the DB and SEED_OUT mode can reuse this run's
// freshly computed games instead.
async function ingestFormations(
  supabase: SupabaseClient<Database> | null,
  getGamesPlayedByTeam: (season: number) => Promise<Map<string, number>>
): Promise<{
  season: number | null;
  tallies: UnitFormationTally[];
  skippedTeams: number;
  failure: string | null;
}> {
  const season = await latestAvailableSeason(PARTICIPATION_TAG, PARTICIPATION_PREFIX);
  if (season === null) {
    return {
      season: null,
      tallies: [],
      skippedTeams: 0,
      failure: 'no available pbp_participation season found',
    };
  }

  try {
    const gamesPlayedByTeam = await getGamesPlayedByTeam(season);

    const url = assetUrl(PARTICIPATION_TAG, `${PARTICIPATION_PREFIX}${season}.csv`);
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);

    const offenseAcc = new FormationAccumulator(resolveTeamCode);
    const defenseAcc = new DefenseFormationAccumulator(resolveTeamCode);
    await parseCsvStream(textChunks(res.body), (record) => {
      const row: ParticipationRow = {
        nflverse_game_id: record.nflverse_game_id ?? '',
        possession_team: record.possession_team ?? '',
        offense_formation: record.offense_formation ?? '',
        offense_personnel: record.offense_personnel ?? '',
        defense_personnel: record.defense_personnel ?? '',
      };
      offenseAcc.addRow(row);
      defenseAcc.addRow(row);
    });

    const offenseResult = offenseAcc.finish(season, gamesPlayedByTeam);
    const defenseResult = defenseAcc.finish(season, gamesPlayedByTeam);
    const tallies: UnitFormationTally[] = [
      ...offenseResult.tallies.map((t) => ({ ...t, unit: 'offense' as const })),
      ...defenseResult.tallies.map((t) => ({ ...t, unit: 'defense' as const })),
    ];
    const skippedTeams = offenseResult.skippedTeams.length + defenseResult.skippedTeams.length;
    const skippedRows = offenseAcc.skipped + defenseAcc.skipped;

    if (supabase && tallies.length) {
      const { error } = await supabase
        .from('team_formations')
        .upsert(tallies, { onConflict: 'team_id,season,unit,rank' });
      if (error) throw new Error(`team_formations upsert: ${error.message}`);
    }

    console.log(
      `formations: season ${season}, ${supabase ? 'wrote' : 'computed'} ${tallies.length} rows ` +
        `(${skippedTeams} team(s) below coverage, ${skippedRows} rows skipped)`
    );
    return { season, tallies, skippedTeams, failure: null };
  } catch (e) {
    return { season, tallies: [], skippedTeams: 0, failure: (e as Error).message };
  }
}

// Fetches nflverse stats_team_reg_<season>.csv rows, transforms them through the
// pure toTeamStatsRows pipeline, and upserts into team_season_stats. Fetch (getText)
// and parse (parseCsv + toTeamStatsRows) are separate calls so that a fetch failure
// and a parse failure can never abort or corrupt one another (two-phase pipeline).
// `seasons` is the complete list of season years to backfill (1999-2025 for a full
// backfill, [latest, latest-1] for the daily job). Idempotent upsert on (team_id,
// season). SKIP_TEAM_STATS env var skips this step entirely for faster dev iteration.
async function ingestTeamStats(
  supabase: SupabaseClient<Database> | null,
  seasons: number[]
): Promise<{
  rows: TeamStatsInsert[];
  skipped: number;
  failures: { season: number; message: string }[];
}> {
  if (process.env.SKIP_TEAM_STATS) {
    console.log('team-stats: skipped (SKIP_TEAM_STATS set)');
    return { rows: [], skipped: 0, failures: [] };
  }

  let skipped = 0;
  const failures: { season: number; message: string }[] = [];
  const allRows: TeamStatsInsert[] = [];

  for (const season of seasons) {
    try {
      const csvText = await getText(assetUrl(TEAM_STATS_TAG, `${TEAM_STATS_PREFIX}${season}.csv`));
      const parsed = parseCsv(csvText);
      const { rows, skipped: seasonSkipped } = toTeamStatsRows(parsed);
      skipped += seasonSkipped;

      if (supabase && rows.length) {
        const { error } = await supabase
          .from('team_season_stats')
          .upsert(rows, { onConflict: 'team_id,season' });
        if (error) throw new Error(`team_season_stats upsert: ${error.message}`);
      }
      allRows.push(...rows);
      console.log(`team-stats ${season}: ${rows.length} rows, skipped ${seasonSkipped}`);
    } catch (e) {
      failures.push({ season, message: (e as Error).message });
    }
  }

  return { rows: allRows, skipped, failures };
}

// PostgREST caps an unranged select at 1000 rows (Supabase's default db-max-rows) --
// `players` already exceeds that (2184+ rows across 32 rosters), so a plain
// `.select('id')` silently returned only the first page and starved knownPlayerIds
// for every player past it, dropping their player_stats rows with no error (shipped
// bug: Jaxon Smith-Njigba and ~1000+ other rostered players had zero player_stats
// rows despite being fully rostered, every run, because they never appeared in this
// set). Page through with `.range()` until a short page signals the end.
const PLAYERS_PAGE_SIZE = 1000;

async function fetchAllPlayerIds(supabase: SupabaseClient<Database>): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += PLAYERS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .range(from, from + PLAYERS_PAGE_SIZE - 1);
    if (error) throw new Error(`players query failed: ${error.message}`);
    for (const row of data ?? []) ids.add(row.id);
    if (!data || data.length < PLAYERS_PAGE_SIZE) break;
  }
  return ids;
}

async function main() {
  // Seed mode writes a SQL file and never touches the DB, so it needs no Supabase creds.
  const seedOut = process.env.SEED_OUT;
  const supabase: SupabaseClient<Database> | null = seedOut
    ? null
    : createClient(getSupabaseUrl(), getSupabaseSecretKey());

  const startedAt = new Date().toISOString();
  const failures: { season: number | string; message: string }[] = [];

  // --seasons scopes games/schedules, team_season_stats, and player_stats alike (see
  // the usage comment above and the player_stats season-selection comment below). Not
  // meaningful in SEED_OUT mode (locked decision: seed data stays current + previous).
  const gamesSeasons = seedOut ? null : parseSeasonsArg(process.argv.slice(2));
  const gamesMinSeason = gamesSeasons === null ? undefined : Math.min(...gamesSeasons);
  if (gamesSeasons !== null && gamesMinSeason !== undefined && gamesMinSeason < SEASONS_MIN) {
    throw new Error(`--seasons includes years before ${SEASONS_MIN}: ${gamesSeasons.join(', ')}`);
  }

  const playersCsv = await getText(assetUrl(PLAYERS_TAG, PLAYERS_FILE));
  const crosswalk = buildCrosswalk(parseCsv(playersCsv));
  console.log(`crosswalk: ${crosswalk.size} gsis_id -> espn_id mappings`);

  let knownPlayerIds: Set<string>;
  if (supabase) {
    knownPlayerIds = await fetchAllPlayerIds(supabase);
  } else {
    let espnSeedSql: string;
    try {
      espnSeedSql = readFileSync(ESPN_SEED_PATH, 'utf8');
    } catch {
      throw new Error(
        `SEED_OUT mode needs ${ESPN_SEED_PATH} to already exist -- run \`npm run gen:espn-seed\` first`
      );
    }
    knownPlayerIds = extractPlayerIds(espnSeedSql);
    if (knownPlayerIds.size === 0) {
      throw new Error(
        `no player ids found in ${ESPN_SEED_PATH} -- is it stale? run \`npm run gen:espn-seed\` first`
      );
    }
  }

  // Season selection: try current calendar year, walk back until an asset exists
  // (2025 wasn't published at spec-verification time -- never hard-code a year), then
  // also pull the season before that. Locked decision: "current + previous season",
  // not a fixed lookback -- unless --seasons is set, in which case player_stats
  // follows the same range as games/schedules/team_season_stats (gamesSeasons, set
  // above) and widens its knownPlayerIds gate accordingly (requireCurrentRoster below;
  // see docs/superpowers/specs/2026-08-13-player-stats-historic-identity-design.md).
  const latestSeason = await latestAvailableSeason(STATS_TAG, STATS_PREFIX);
  const seasons = gamesSeasons ?? (latestSeason === null ? [] : [latestSeason, latestSeason - 1]);
  const requireCurrentRoster = gamesSeasons === null;
  if (latestSeason === null && gamesSeasons === null) {
    failures.push({ season: 'latest', message: 'no available stats_player_reg season found' });
  }

  let rowsWritten = 0;
  let skipped = 0;
  const allStatsRows: PlayerStatsInsert[] = [];

  for (const season of seasons) {
    try {
      const statsCsv = await getText(assetUrl(STATS_TAG, `${STATS_PREFIX}${season}.csv`));
      const { rows, skipped: seasonSkipped } = toPlayerStatsRows(
        parseCsv(statsCsv),
        crosswalk,
        knownPlayerIds,
        resolveTeamCode,
        { requireCurrentRoster }
      );
      skipped += seasonSkipped;
      if (supabase && rows.length) {
        const { error } = await supabase
          .from('player_stats')
          .upsert(rows, { onConflict: 'player_id,season,season_type' });
        if (error) throw new Error(`player_stats upsert: ${error.message}`);
      }
      allStatsRows.push(...rows);
      rowsWritten += rows.length;
      console.log(`${season}: wrote ${rows.length} rows, skipped ${seasonSkipped}`);
    } catch (e) {
      failures.push({ season, message: (e as Error).message });
    }
  }

  // Schedules + games (nflverse nfldata/games.csv), a second dataset in the same run.
  const gamesResult = await ingestGames(supabase, gamesMinSeason);
  if (gamesResult.failure) failures.push({ season: 'games', message: gamesResult.failure });
  skipped += gamesResult.skipped;

  // Formations depend on this run's games (coverage denominator), so it runs after
  // ingestGames. Live mode queries the DB (may carry more history than this run wrote);
  // SEED_OUT mode reuses the games this same run just computed in-memory.
  const formationsResult = await ingestFormations(supabase, (season) =>
    supabase
      ? getGamesPlayedByTeamDb(supabase, season)
      : Promise.resolve(gamesPlayedByTeamFromGames(gamesResult.games, season))
  );
  if (formationsResult.failure) {
    failures.push({
      season: formationsResult.season ?? 'formations',
      message: formationsResult.failure,
    });
  }

  // Team season stats: backfill full --seasons range (FKs to teams, not players, so
  // no identity problem) or latest + previous with no flag. The --seasons scoping
  // is shared with games/schedules: gamesSeasons is set above from --seasons (or null
  // for the daily job's default), and teamStatsSeasons follows the same rule.
  const teamStatsSeasons =
    gamesSeasons ?? (latestSeason === null ? [] : [latestSeason, latestSeason - 1]);
  const teamStatsResult = await ingestTeamStats(supabase, teamStatsSeasons);
  for (const f of teamStatsResult.failures) failures.push({ season: f.season, message: f.message });
  skipped += teamStatsResult.skipped;

  // Seed mode: dump everything computed above to SQL and stop -- no DB writes (already
  // skipped throughout), no ingestion_runs row.
  if (seedOut) {
    const parts = [
      '-- Generated by `npm run gen:nflverse-seed` (scripts/ingest-nflverse.mts SEED_OUT mode).',
      '-- nflverse player-stats/schedules/games/formations snapshot for local `supabase db',
      '-- reset`. Requires supabase/seed.sql to already be loaded (players FK). Do not',
      '-- hand-edit; regenerate.',
      '',
      buildPlayerStatsSeedSql(allStatsRows),
      buildSchedulesAndGamesSeedSql(gamesResult.schedules, gamesResult.games),
      buildTeamFormationsSeedSql(formationsResult.tallies),
      buildTeamStatsSeedSql(teamStatsResult.rows),
    ];
    writeFileSync(seedOut, parts.filter(Boolean).join('\n') + '\n');
    console.log(
      `\nWrote seed: ${allStatsRows.length} player-stat rows, ${gamesResult.games.length} games, ` +
        `${gamesResult.schedules.length} schedules, ${formationsResult.tallies.length} formation rows, ` +
        `${teamStatsResult.rows.length} team-stats rows -> ${seedOut}`
    );
    if (failures.length) {
      console.log('Errors/skips:');
      for (const f of failures) console.log(`  ${f.season}: ${f.message}`);
    }
    return;
  }
  if (!supabase) return; // unreachable (seedOut handled above); narrows the type below

  const finishedAt = new Date().toISOString();
  const totalWritten =
    rowsWritten +
    gamesResult.games.length +
    gamesResult.schedules.length +
    formationsResult.tallies.length +
    teamStatsResult.rows.length;
  const status = failures.length === 0 ? 'success' : totalWritten > 0 ? 'partial' : 'failure';

  const { error: runError } = await supabase.from('ingestion_runs').insert({
    source: 'nflverse',
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    teams_written: totalWritten,
    errors: {
      seasons,
      player_stats_rows: rowsWritten,
      games_min_season: gamesMinSeason ?? null,
      games_written: gamesResult.games.length,
      schedules_written: gamesResult.schedules.length,
      formations_season: formationsResult.season,
      formations_written: formationsResult.tallies.length,
      formations_teams_below_coverage: formationsResult.skippedTeams,
      team_stats_seasons: teamStatsSeasons,
      team_stats_rows: teamStatsResult.rows.length,
      team_stats_skipped: teamStatsResult.skipped,
      skipped,
      failures,
    },
  });
  if (runError) throw new Error(`failed to record ingestion_runs: ${runError.message}`);

  console.log(
    `\nWrote ${rowsWritten} player-stat rows across ${seasons.length} season(s), ` +
      `${gamesResult.games.length} games, ${gamesResult.schedules.length} schedules, ` +
      `${formationsResult.tallies.length} formation rows, ` +
      `${teamStatsResult.rows.length} team-stats rows across ${teamStatsSeasons.length} season(s). ` +
      `Status: ${status}`
  );
  if (failures.length) {
    console.log('Errors/skips:');
    for (const f of failures) console.log(`  ${f.season}: ${f.message}`);
  }
  if (status === 'failure') process.exit(1);
  // In scheduled runs (STRICT set) a partial run is a half-stale DB, so fail loud
  // enough to turn the workflow red. Hand-runs stay lenient and exit 0 on partial.
  if (status === 'partial' && process.env.STRICT) {
    console.error('STRICT: partial run treated as failure (some seasons did not write)');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
