// Fetches nflverse's season-scoped roster + player-stats CSVs, joins them through the
// pure lib/nflverse pipeline (position mapping + usage-based depth heuristic,
// docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-design.md), and upserts
// `roster_history`. Run by hand for the one-time 1999-present backfill, or by the
// daily job (current season only, no --seasons flag). Never part of `next build`.
//
// Usage:
//   npm run ingest:rosters                    # current season only (daily job)
//   npm run ingest:rosters -- --seasons 1999-2025
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY in the environment (secret key
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).
//
// Seed mode: `npm run gen:rosters-seed` sets SEED_OUT=supabase/seed-roster-history.sql,
// which fetches + transforms exactly the same way but writes a committed seed script
// instead of touching the DB (no Supabase creds needed) -- mirrors ingest-espn.mts's
// SEED_OUT mode. roster_history has no FK to `players` (nflverse-keyed by gsis_id), so
// unlike gen:nflverse-seed this needs no other seed file loaded first. Current season
// only, same as the daily job -- the --seasons backfill flag isn't meaningful for a
// local dev seed. `supabase db reset` then restores it offline.

import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';

dotenv.config({ path: '.env.local' });
import { parseCsv } from '@/lib/nflverse/csv';
import { assetUrl, latestAvailableSeason } from '@/lib/nflverse/assets';
import { buildCrosswalk } from '@/lib/nflverse/crosswalk';
import { resolveTeamCode } from '@/lib/nflverse/team-codes';
import {
  toRosterHistoryRows,
  SEASONS_MIN,
  type RosterHistoryInsert,
} from '@/lib/nflverse/roster-history';
import { parseSeasonsArg } from '@/lib/utils/ingest/seasons-arg';
import { buildRosterHistorySeedSql } from '@/lib/nflverse/seed-sql';
import type { Database } from '@/lib/database.types';

const ROSTERS_TAG = 'rosters';
const ROSTERS_PREFIX = 'roster_';
// Same tag/prefix as scripts/ingest-nflverse.mts's player-stats ingest -- see that
// file's header comment for the `player_stats` -> `stats_player` rename history.
const STATS_TAG = 'stats_player';
const STATS_PREFIX = 'stats_player_reg_';
// The all-era gsis_id -> espn_id crosswalk (players.csv). Same source the player-stats
// ingest uses; fills espn_id for older roster rows whose own CSV column is empty.
const PLAYERS_TAG = 'players';
const PLAYERS_FILE = 'players.csv';
// Supabase upsert payload cap: a season is ~1,700 rows, comfortably under one chunk,
// but the full backfill sends every season in one process run.
const UPSERT_CHUNK = 1000;

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
  // Seed mode writes a SQL file and never touches the DB, so it needs no Supabase creds.
  const seedOut = process.env.SEED_OUT;
  const supabase: SupabaseClient<Database> | null = seedOut
    ? null
    : createClient(getSupabaseUrl(), getSupabaseSecretKey());

  const startedAt = new Date().toISOString();
  const failures: { season: number | string; message: string }[] = [];

  // --seasons isn't meaningful in SEED_OUT mode (locked decision: seed data stays
  // current-season-only, same as the daily job's default).
  let seasons = seedOut ? null : parseSeasonsArg(process.argv.slice(2));
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

  // players.csv once per run: the gsis_id -> espn_id crosswalk that fills espn_id for
  // older roster rows whose own CSV column never carried it (see toRosterHistoryRows).
  // A fetch failure is a degrade, not an abort: espn_id falls back to the pre-fix
  // null behavior and the run records the failure instead of dying before writing a
  // single row (the per-season fetches are caught individually; this one was new and
  // would otherwise be the only uncaught fetch in the script). An empty map from a
  // 200-but-bad body is visible via the recorded mapping count, not silent.
  let crosswalk: Map<string, string>;
  let crosswalkFailure: string | null = null;
  try {
    crosswalk = buildCrosswalk(parseCsv(await getText(assetUrl(PLAYERS_TAG, PLAYERS_FILE))));
  } catch (e) {
    crosswalk = new Map();
    crosswalkFailure = (e as Error).message;
    // SEED_OUT keeps hard-failing: the generated seed is a committed artifact, so a
    // degraded crosswalk would silently bake null espn_ids into every local reset.
    if (seedOut) throw e;
  }
  console.log(
    crosswalkFailure
      ? `crosswalk: fetch failed (${crosswalkFailure}); espn_id left null where the roster CSV has none`
      : `crosswalk: ${crosswalk.size} gsis_id -> espn_id mappings`
  );

  let rowsWritten = 0;
  let skipped = 0;
  const allRows: RosterHistoryInsert[] = [];

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
        resolveTeamCode,
        crosswalk
      );
      skipped += seasonSkipped;

      if (supabase) {
        for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
          const chunk = rows.slice(i, i + UPSERT_CHUNK);
          const { error } = await supabase
            .from('roster_history')
            .upsert(chunk, { onConflict: 'season,team_id,gsis_id' });
          if (error) throw new Error(`roster_history upsert: ${error.message}`);
        }
      }
      allRows.push(...rows);
      rowsWritten += rows.length;
      console.log(
        `${season}: ${supabase ? 'wrote' : 'computed'} ${rows.length} rows, skipped ${seasonSkipped}`
      );
    } catch (e) {
      failures.push({ season, message: (e as Error).message });
    }
  }

  // Seed mode: dump the freshly-computed rows to SQL and stop -- no DB writes (already
  // skipped above), no ingestion_runs row.
  if (seedOut) {
    const parts = [
      '-- Generated by `npm run gen:rosters-seed` (scripts/ingest-nflverse-rosters.mts SEED_OUT mode).',
      '-- nflverse roster_history snapshot for local `supabase db reset`. Do not hand-edit; regenerate.',
      '',
      buildRosterHistorySeedSql(allRows),
    ];
    writeFileSync(seedOut, parts.filter(Boolean).join('\n') + '\n');
    console.log(`\nWrote seed: ${allRows.length} roster_history rows -> ${seedOut}`);
    if (failures.length) {
      console.log('Errors/skips:');
      for (const f of failures) console.log(`  ${f.season}: ${f.message}`);
    }
    return;
  }
  if (!supabase) return; // unreachable (seedOut handled above); narrows the type below

  const finishedAt = new Date().toISOString();
  const status = failures.length === 0 ? 'success' : rowsWritten > 0 ? 'partial' : 'failure';

  const { error: runError } = await supabase.from('ingestion_runs').insert({
    source: 'nflverse-rosters',
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    teams_written: rowsWritten,
    errors: {
      seasons,
      rows_written: rowsWritten,
      skipped,
      failures,
      ...(crosswalkFailure ? { crosswalk_failure: crosswalkFailure } : {}),
    },
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
