// Fetches nflverse's season-scoped roster + player-stats CSVs, joins them through the
// pure lib/nflverse pipeline (position mapping + usage-based depth heuristic,
// docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-design.md), and upserts
// `roster_history`. Run by hand for the one-time 1999-present backfill, or by the
// weekly job (current season only, no --seasons flag). Never part of `next build`.
//
// Usage:
//   npm run ingest:rosters                    # current season only (weekly job)
//   npm run ingest:rosters -- --seasons 1999-2025
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (service role
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
import { parseCsv } from '../lib/nflverse/csv';
import { assetUrl, latestAvailableSeason } from '../lib/nflverse/assets';
import { resolveTeamCode } from '../lib/nflverse/team-codes';
import { toRosterHistoryRows, SEASONS_MIN } from '../lib/nflverse/roster-history';
import type { Database } from '../lib/database.types';

const ROSTERS_TAG = 'rosters';
const ROSTERS_PREFIX = 'roster_';
// Same tag/prefix as scripts/ingest-nflverse.mts's player-stats ingest -- see that
// file's header comment for the `player_stats` -> `stats_player` rename history.
const STATS_TAG = 'stats_player';
const STATS_PREFIX = 'stats_player_reg_';
// Supabase upsert payload cap: a season is ~1,700 rows, comfortably under one chunk,
// but the full backfill sends every season in one process run.
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

// `--seasons 1999-2025` (a range) or `--seasons 2013` (one season). No flag -> null,
// meaning "the weekly job's default: whatever season is currently live".
export function parseSeasonsArg(argv: string[]): number[] | null {
  const flagIndex = argv.indexOf('--seasons');
  if (flagIndex === -1) return null;
  const value = argv[flagIndex + 1];
  if (!value) throw new Error('--seasons requires a value, e.g. --seasons 1999-2025');
  const rangeMatch = value.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    const [, startStr, endStr] = rangeMatch;
    const start = Number(startStr);
    const end = Number(endStr);
    if (start > end) throw new Error(`--seasons range is backwards: ${value}`);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const single = Number(value);
  if (!Number.isInteger(single))
    throw new Error(`--seasons value is not a year or range: ${value}`);
  return [single];
}

async function main() {
  const supabase: SupabaseClient<Database> = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  );

  const startedAt = new Date().toISOString();
  const failures: { season: number | string; message: string }[] = [];

  let seasons = parseSeasonsArg(process.argv.slice(2));
  if (seasons === null) {
    // Weekly job: gate on the STATS file, not the roster file. nflverse publishes a new
    // season's roster_<season>.csv (rosters/depth charts) well before that season's
    // stats_player_reg_<season>.csv exists -- gating on roster availability picked a
    // season the depth heuristic couldn't actually rank (no stats to join against),
    // 404ing the whole run. Same tag/prefix ingest-nflverse.mts's player-stats ingest
    // already gates on, for the same reason.
    const latestSeason = await latestAvailableSeason(STATS_TAG, STATS_PREFIX);
    seasons = latestSeason === null ? [] : [latestSeason];
    if (latestSeason === null) {
      failures.push({
        season: 'latest',
        message: 'no available stats_player_reg_<season> file found',
      });
    }
  }
  const outOfRange = seasons.filter((s) => s < SEASONS_MIN);
  if (outOfRange.length) {
    throw new Error(
      `--seasons includes years before ${SEASONS_MIN} (no stats to rank by): ${outOfRange.join(', ')}`
    );
  }

  let rowsWritten = 0;
  let skipped = 0;

  for (const season of seasons) {
    try {
      const [rosterCsv, statsCsv] = await Promise.all([
        getText(assetUrl(ROSTERS_TAG, `${ROSTERS_PREFIX}${season}.csv`)),
        getText(assetUrl(STATS_TAG, `${STATS_PREFIX}${season}.csv`)),
      ]);
      const { rows, skipped: seasonSkipped } = toRosterHistoryRows(
        season,
        parseCsv(rosterCsv),
        parseCsv(statsCsv),
        resolveTeamCode
      );
      skipped += seasonSkipped;

      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK);
        const { error } = await supabase
          .from('roster_history')
          .upsert(chunk, { onConflict: 'season,team_id,gsis_id' });
        if (error) throw new Error(`roster_history upsert: ${error.message}`);
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
    source: 'nflverse-rosters',
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    teams_written: rowsWritten,
    errors: { seasons, rows_written: rowsWritten, skipped, failures },
  });
  if (runError) throw new Error(`failed to record ingestion_runs: ${runError.message}`);

  console.log(
    `\nWrote ${rowsWritten} roster_history rows across ${seasons.length} season(s). Status: ${status}`
  );
  if (failures.length) {
    console.log('Errors:');
    for (const f of failures) console.log(`  ${f.season}: ${f.message}`);
  }
  if (status === 'failure') process.exit(1);
  // Scheduled runs (STRICT set) treat a partial run as a half-stale DB and fail loud;
  // hand-runs (the one-time backfill) stay lenient and exit 0 on partial.
  if (status === 'partial' && process.env.STRICT) {
    console.error('STRICT: partial run treated as failure (some seasons did not write)');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
