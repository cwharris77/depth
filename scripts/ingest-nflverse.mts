// Fetches nflverse's player id crosswalk + the latest two seasons of player season
// stats, transforms them through the pure lib/nflverse pipeline, and upserts into
// Postgres (Supabase). Run by hand (or on a schedule -- see docs/nflverse.md). Never
// part of `next build`.
//
// Usage: npm run ingest:nflverse
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (service role
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
import { parseCsv } from '../lib/nflverse/csv';
import { assetUrl, latestAvailableSeason } from '../lib/nflverse/assets';
import { buildCrosswalk } from '../lib/nflverse/crosswalk';
import { toPlayerStatsRows } from '../lib/nflverse/transform';
import { toScheduleAndGameRows } from '../lib/nflverse/games';
import { resolveTeamCode } from '../lib/nflverse/team-codes';
import type { Database } from '../lib/database.types';

const PLAYERS_TAG = 'players';
const PLAYERS_FILE = 'players.csv';
const STATS_TAG = 'player_stats';
const STATS_PREFIX = 'stats_player_reg_';
// The schedule/results file lives in nfldata (one CSV, every season 1999+), not the
// season-suffixed nflverse-data release assets -- so it has its own raw URL, not assetUrl.
const GAMES_URL = 'https://github.com/nflverse/nfldata/raw/master/data/games.csv';
// Supabase upsert payload cap: games is ~7.5k rows, chunk it so one call doesn't time out.
const UPSERT_CHUNK = 1000;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

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

// Fetch the nflverse schedule/results file, crosswalk team codes, and upsert schedules
// (the per-team-season anchor) then games -- schedules first so the games' composite FKs
// resolve. Idempotent upserts (conflict on the PKs), so a rerun is always safe. Returns
// counts + a fetch/transform failure for the ingestion_runs record; a games failure never
// throws out of the whole run, matching the per-season player-stats error handling.
async function ingestGames(supabase: SupabaseClient<Database>): Promise<{
  schedulesWritten: number;
  gamesWritten: number;
  skipped: number;
  failure: string | null;
}> {
  try {
    const csv = await getText(GAMES_URL);
    const { games, schedules, skipped } = toScheduleAndGameRows(parseCsv(csv), resolveTeamCode);

    const { error: schedError } = await supabase
      .from('schedules')
      .upsert(schedules, { onConflict: 'team_id,season' });
    if (schedError) throw new Error(`schedules upsert: ${schedError.message}`);

    for (let i = 0; i < games.length; i += UPSERT_CHUNK) {
      const chunk = games.slice(i, i + UPSERT_CHUNK);
      const { error } = await supabase.from('games').upsert(chunk, { onConflict: 'game_id' });
      if (error) throw new Error(`games upsert: ${error.message}`);
    }

    console.log(
      `games: wrote ${games.length} games, ${schedules.length} schedules, skipped ${skipped}`
    );
    return {
      schedulesWritten: schedules.length,
      gamesWritten: games.length,
      skipped,
      failure: null,
    };
  } catch (e) {
    return { schedulesWritten: 0, gamesWritten: 0, skipped: 0, failure: (e as Error).message };
  }
}

async function main() {
  const supabase: SupabaseClient<Database> = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  );

  const startedAt = new Date().toISOString();
  const failures: { season: number | string; message: string }[] = [];

  const playersCsv = await getText(assetUrl(PLAYERS_TAG, PLAYERS_FILE));
  const crosswalk = buildCrosswalk(parseCsv(playersCsv));
  console.log(`crosswalk: ${crosswalk.size} gsis_id -> espn_id mappings`);

  const { data: playerRows, error: playersQueryError } = await supabase
    .from('players')
    .select('id');
  if (playersQueryError) throw new Error(`players query failed: ${playersQueryError.message}`);
  const knownPlayerIds = new Set((playerRows ?? []).map((p) => p.id));

  // Season selection: try current calendar year, walk back until an asset exists
  // (2025 wasn't published at spec-verification time -- never hard-code a year), then
  // also pull the season before that. Locked decision: "current + previous season",
  // not a fixed lookback.
  const latestSeason = await latestAvailableSeason(STATS_TAG, STATS_PREFIX);
  const seasons = latestSeason === null ? [] : [latestSeason, latestSeason - 1];
  if (latestSeason === null) {
    failures.push({ season: 'latest', message: 'no available stats_player_reg season found' });
  }

  let rowsWritten = 0;
  let skipped = 0;

  for (const season of seasons) {
    try {
      const statsCsv = await getText(assetUrl(STATS_TAG, `${STATS_PREFIX}${season}.csv`));
      const { rows, skipped: seasonSkipped } = toPlayerStatsRows(
        parseCsv(statsCsv),
        crosswalk,
        knownPlayerIds
      );
      skipped += seasonSkipped;
      if (rows.length) {
        const { error } = await supabase
          .from('player_stats')
          .upsert(rows, { onConflict: 'player_id,season,season_type' });
        if (error) throw new Error(`player_stats upsert: ${error.message}`);
      }
      rowsWritten += rows.length;
      console.log(`${season}: wrote ${rows.length} rows, skipped ${seasonSkipped}`);
    } catch (e) {
      failures.push({ season, message: (e as Error).message });
    }
  }

  // Schedules + games (nflverse nfldata/games.csv), a second dataset in the same run.
  const gamesResult = await ingestGames(supabase);
  if (gamesResult.failure) failures.push({ season: 'games', message: gamesResult.failure });
  skipped += gamesResult.skipped;

  const finishedAt = new Date().toISOString();
  const totalWritten = rowsWritten + gamesResult.gamesWritten + gamesResult.schedulesWritten;
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
      games_written: gamesResult.gamesWritten,
      schedules_written: gamesResult.schedulesWritten,
      skipped,
      failures,
    },
  });
  if (runError) throw new Error(`failed to record ingestion_runs: ${runError.message}`);

  console.log(
    `\nWrote ${rowsWritten} player-stat rows across ${seasons.length} season(s), ` +
      `${gamesResult.gamesWritten} games, ${gamesResult.schedulesWritten} schedules. Status: ${status}`
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
