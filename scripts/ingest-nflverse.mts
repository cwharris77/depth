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
import type { Database } from '../lib/database.types';

const PLAYERS_TAG = 'players';
const PLAYERS_FILE = 'players.csv';
const STATS_TAG = 'player_stats';
const STATS_PREFIX = 'stats_player_reg_';

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

  const finishedAt = new Date().toISOString();
  const status = failures.length === 0 ? 'success' : rowsWritten > 0 ? 'partial' : 'failure';

  const { error: runError } = await supabase.from('ingestion_runs').insert({
    source: 'nflverse',
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    teams_written: rowsWritten,
    errors: { seasons, rows_written: rowsWritten, skipped, failures },
  });
  if (runError) throw new Error(`failed to record ingestion_runs: ${runError.message}`);

  console.log(`\nWrote ${rowsWritten} rows across ${seasons.length} season(s). Status: ${status}`);
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
