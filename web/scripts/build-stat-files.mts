// Builds the per-player career stat files (`v1/players/{espn_id}/seasons.json`) straight
// from nflverse weekly release assets. Not part of `next build`; run by hand or by the
// publish workflow.
//
// Usage (from web/):
//   npm run stat-files:build -- --seasons 1999-2026 --out .stat-files [--no-games]
//   npm run stat-files:build -- --target r2 --bucket <name> [--seasons 1999-2026]
//
// `--target r2` publishes to the bucket named by `--bucket` (credentials come from the
// R2_* environment, never arguments). Without `--seasons` the build rebuilds the current
// window and reads every other season's checkpoint from the target; a missing checkpoint
// fails the run and names the backfill command. Nothing is uploaded until every season has
// been built and has passed the shrink guard (`--allow-shrink <season>` overrides one
// season). Every fetched source file is archived gzipped under `_raw/`; `--from-raw`
// rebuilds from that archive instead of nflverse.
//
// Game logs (`v1/players/{espn_id}/games/{season}.json`) are written from the same weekly
// parse as the season ledgers, one season at a time so a season's weekly rows are released
// before the next is fetched. `--no-games` rebuilds only the season ledgers.
//
// I/O glue only: fetching, header-contract checks, and the publisher live here; the
// consolidation is pure (`lib/stat-files/player-seasons.ts`). Identity resolves through the
// `players.csv` crosswalk (gsis/pfr → ESPN), never name matching.
//
// Every fetch goes through the header contract and `fetchRawGroup`: a missing
// required column, or an in-range 404, fails the build; only an out-of-range 404 (a source
// that doesn't publish that season) is a skip. Per season the consolidated rows are written
// as a checkpoint (`v1/_build/season-rows/{season}.json`), then every player's career file
// is assembled from all checkpoints on disk — so a daily run that rebuilds one season still
// rewrites complete careers.

import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assetUrl } from '@/lib/nflverse/assets';
import { parseCsv, parseCsvHeader } from '@/lib/nflverse/csv';
import { toScheduleAndGameRows } from '@/lib/nflverse/games';
import { buildCrosswalk, buildPfrCrosswalk } from '@/lib/nflverse/crosswalk';
import { assertHeader, sourceContract, type SourceId } from '@/lib/nflverse/source-contract';
import { isPublishedSeason } from '@/lib/nflverse/source-coverage';
import { fetchRawGroup } from '@/lib/nflverse/raw-group-guard';
import { resolveTeamCode } from '@/lib/nflverse/team-codes';
import { parseSeasonsArg } from '@/lib/utils/ingest/seasons-arg';
import { currentSeasonOf, nflSeasonState } from '@/lib/utils/team/season-state';
import type { Database } from '@/lib/database.types';

import {
  buildGameIndex,
  consolidateGames,
  type GameIndex,
  type PlayerGameRow,
} from '@/lib/stat-files/player-games';
import {
  MissingCheckpointError,
  runStatFileBuild,
  ShrinkGuardError,
  type ManifestSources,
} from '@/lib/stat-files/build-run';
import type { StatFileTarget } from '@/lib/stat-files/publish';
import { createRawArchive, createSourceFetcher } from '@/lib/stat-files/raw-archive';
import { FileSystemStatFileTarget, r2StatFileTargetFromEnv } from '@/lib/stat-files/targets';
import {
  consolidateSeason,
  toPlayerWeekRows,
  type PlayerSeasonRow,
  type PlayerWeekRow,
  type WeekRowResult,
} from '@/lib/stat-files/player-seasons';

const PLAYERS_TAG = 'players';
const PLAYERS_FILE = 'players.csv';
const STATS_TAG = 'stats_player';
const SNAP_COUNTS_TAG = 'snap_counts';
const NGS_TAG = 'nextgen_stats';
const PFR_TAG = 'pfr_advstats';
const GAMES_URL = 'https://github.com/nflverse/nfldata/raw/master/data/games.csv';

interface SourceCounts {
  min: number | null;
  max: number | null;
  unresolved: number;
}

const coverage = new Map<SourceId, SourceCounts>();

function recordSource(source: SourceId, season: number, unresolved: number): void {
  const counts = coverage.get(source) ?? { min: null, max: null, unresolved: 0 };
  counts.min = counts.min === null ? season : Math.min(counts.min, season);
  counts.max = counts.max === null ? season : Math.max(counts.max, season);
  counts.unresolved += unresolved;
  coverage.set(source, counts);
}

async function getText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      return url.endsWith('.gz') ? gunzipSync(buffer).toString('utf8') : buffer.toString('utf8');
    } catch (error) {
      lastError = error;
      const message = (error as Error).message;
      // Only a 404 is a source-coverage decision; anything else is a genuine blip worth
      // retrying (a 404 will not become a 200 on retry).
      if (/^404\b/.test(message)) throw error;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

interface Args {
  seasons: number[] | null;
  out: string;
  games: boolean;
  target: 'fs' | 'r2';
  bucket: string | null;
  fromRaw: boolean;
  allowShrink: number[];
}

function flagValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  return index === -1 ? null : (argv[index + 1] ?? null);
}

function parseArgs(argv: string[]): Args {
  const target = flagValue(argv, '--target') ?? 'fs';
  if (target !== 'fs' && target !== 'r2') throw new Error(`--target must be fs or r2: ${target}`);
  const allowShrink = argv.flatMap((arg, i) =>
    arg === '--allow-shrink' ? [Number(argv[i + 1])] : []
  );
  if (allowShrink.some((season) => !Number.isInteger(season))) {
    throw new Error('--allow-shrink takes a season, e.g. --allow-shrink 2019');
  }
  return {
    seasons: parseSeasonsArg(argv),
    out: flagValue(argv, '--out') ?? '.stat-files',
    games: !argv.includes('--no-games'),
    target,
    bucket: flagValue(argv, '--bucket'),
    fromRaw: argv.includes('--from-raw'),
    allowShrink,
  };
}

/** Every fetch in a run goes through this: live + archived, or the archive alone. */
let fetchSource: (url: string) => Promise<string> = getText;

const releaseUpdatedAtByTag = new Map<string, string | undefined>();

/** The release's `updated_at`, for the archive meta. Best effort: a miss omits it. */
async function releaseUpdatedAt(url: string): Promise<string | undefined> {
  const tag = /\/releases\/download\/([^/]+)\//.exec(url)?.[1];
  if (!tag) return undefined;
  if (releaseUpdatedAtByTag.has(tag)) return releaseUpdatedAtByTag.get(tag);
  let updated: string | undefined;
  try {
    const token = process.env.GITHUB_TOKEN;
    const res = await fetch(
      `https://api.github.com/repos/nflverse/nflverse-data/releases/tags/${tag}`,
      { headers: token ? { authorization: `Bearer ${token}` } : {} }
    );
    if (res.ok) updated = ((await res.json()) as { updated_at?: string }).updated_at;
  } catch {
    // The archive is still valid without the release timestamp.
  }
  releaseUpdatedAtByTag.set(tag, updated);
  return updated;
}

interface BoxSource {
  rows: PlayerWeekRow[];
  result: WeekRowResult;
}

async function fetchWeekRows(opts: {
  url: string;
  source: SourceId;
  season: number;
  latestCompletedSeason: number;
  idColumn: string;
  crosswalk?: ReadonlyMap<string, string>;
  teamColumn: string;
  seasonTypeColumn: string;
  weekColumn: string;
  loggedNewColumnSources: Set<string>;
}): Promise<BoxSource> {
  const guarded = await fetchRawGroup(
    { source: opts.source, table: opts.source, season: opts.season, tasks: [{ url: opts.url }] },
    {
      fetchCsv: (url) => fetchSource(url),
      latestCompletedSeason: opts.latestCompletedSeason,
      loggedNewColumns: opts.loggedNewColumnSources,
    }
  );
  if (guarded.status === 'skip')
    return { rows: [], result: { rows: [], skipped: 0, unresolved: 0 } };
  if (guarded.status === 'failure') throw new Error(guarded.message);
  const { csv } = guarded.fetched[0];
  const result = toPlayerWeekRows(parseCsv(csv), {
    idColumn: opts.idColumn,
    crosswalk: opts.crosswalk,
    teamColumn: opts.teamColumn,
    seasonTypeColumn: opts.seasonTypeColumn,
    weekColumn: opts.weekColumn,
    resolveTeam: resolveTeamCode,
  });
  recordSource(opts.source, opts.season, result.unresolved);
  return { rows: result.rows, result };
}

/**
 * A partitioned source (PFR pass/def/rush/rec, NGS passing/rushing/receiving) is one
 * contract unioned across its files, so fetch every family, check the union header once,
 * then merge the rows. A 404 in range fails; a 404 outside the range is a skip for the
 * whole family set.
 */
async function fetchPartitioned(
  files: { url: string; source: SourceId; idColumn: string }[],
  opts: {
    season: number;
    latestCompletedSeason: number;
    crosswalk: ReadonlyMap<string, string>;
    teamColumn: string;
    seasonTypeColumn: string;
    weekColumn: string;
    loggedNewColumnSources: Set<string>;
  }
): Promise<BoxSource> {
  const source = files[0].source;
  const guarded = await fetchRawGroup(
    { source, table: source, season: opts.season, tasks: files },
    {
      fetchCsv: (url) => fetchSource(url),
      latestCompletedSeason: opts.latestCompletedSeason,
      loggedNewColumns: opts.loggedNewColumnSources,
    }
  );
  if (guarded.status === 'skip')
    return { rows: [], result: { rows: [], skipped: 0, unresolved: 0 } };
  if (guarded.status === 'failure') throw new Error(guarded.message);
  const { fetched } = guarded;

  const rows: PlayerWeekRow[] = [];
  let skipped = 0;
  let unresolved = 0;
  for (const { csv } of fetched) {
    const result = toPlayerWeekRows(parseCsv(csv), {
      idColumn: files[0].idColumn,
      crosswalk: opts.crosswalk,
      teamColumn: opts.teamColumn,
      seasonTypeColumn: opts.seasonTypeColumn,
      weekColumn: opts.weekColumn,
      resolveTeam: resolveTeamCode,
    });
    rows.push(...result.rows);
    skipped += result.skipped;
    unresolved += result.unresolved;
  }
  recordSource(source, opts.season, unresolved);
  return { rows, result: { rows, skipped, unresolved } };
}

async function buildSeason(
  season: number,
  ctx: {
    latestCompletedSeason: number;
    gsis: ReadonlyMap<string, string>;
    pfr: ReadonlyMap<string, string>;
    loggedNewColumnSources: Set<string>;
    qbrRows: () => Promise<PlayerWeekRow[]>;
    gameIndex: GameIndex | null;
  }
): Promise<{ rows: PlayerSeasonRow[]; games: PlayerGameRow[] }> {
  const box = await fetchWeekRows({
    url: assetUrl(STATS_TAG, `stats_player_week_${season}.csv`),
    source: 'stats_player_week',
    season,
    latestCompletedSeason: ctx.latestCompletedSeason,
    idColumn: 'player_id',
    crosswalk: ctx.gsis,
    teamColumn: 'team',
    seasonTypeColumn: 'season_type',
    weekColumn: 'week',
    loggedNewColumnSources: ctx.loggedNewColumnSources,
  });

  let snaps: PlayerWeekRow[] = [];
  if (isPublishedSeason('snap_counts', season)) {
    snaps = (
      await fetchWeekRows({
        url: assetUrl(SNAP_COUNTS_TAG, `snap_counts_${season}.csv`),
        source: 'snap_counts',
        season,
        latestCompletedSeason: ctx.latestCompletedSeason,
        idColumn: 'pfr_player_id',
        crosswalk: ctx.pfr,
        teamColumn: 'team',
        seasonTypeColumn: 'game_type',
        weekColumn: 'week',
        loggedNewColumnSources: ctx.loggedNewColumnSources,
      })
    ).rows;
  }

  let pfr: PlayerWeekRow[] = [];
  if (isPublishedSeason('pfr_advstats', season)) {
    pfr = (
      await fetchPartitioned(
        ['pass', 'def', 'rush', 'rec'].map((family) => ({
          url: assetUrl(PFR_TAG, `advstats_week_${family}_${season}.csv`),
          source: 'pfr_advstats' as SourceId,
          idColumn: 'pfr_player_id',
        })),
        {
          season,
          latestCompletedSeason: ctx.latestCompletedSeason,
          crosswalk: ctx.pfr,
          teamColumn: 'team',
          seasonTypeColumn: 'game_type',
          weekColumn: 'week',
          loggedNewColumnSources: ctx.loggedNewColumnSources,
        }
      )
    ).rows;
  }

  let ngs: PlayerWeekRow[] = [];
  if (isPublishedSeason('nextgen_stats', season)) {
    ngs = (
      await fetchPartitioned(
        ['passing', 'rushing', 'receiving'].map((family) => ({
          url: assetUrl(NGS_TAG, `ngs_${season}_${family}.csv.gz`),
          source: 'nextgen_stats' as SourceId,
          idColumn: 'player_gsis_id',
        })),
        {
          season,
          latestCompletedSeason: ctx.latestCompletedSeason,
          crosswalk: ctx.gsis,
          teamColumn: 'team_abbr',
          seasonTypeColumn: 'season_type',
          weekColumn: 'week',
          loggedNewColumnSources: ctx.loggedNewColumnSources,
        }
      )
    ).rows;
  }

  // QBR is one whole-history file per grain, so it is fetched once and filtered per season.
  const qbr = (await ctx.qbrRows()).filter((row) => row.season === season);

  const sections = { box: box.rows, snaps, pfr, ngs, qbr };
  return {
    rows: consolidateSeason(season, sections),
    games: ctx.gameIndex ? consolidateGames(season, sections, ctx.gameIndex) : [],
  };
}

/** nfldata games.csv → the (season, week, team) → game index game rows join through. */
async function loadGameIndex(loggedNewColumns: Set<string>): Promise<GameIndex> {
  const csv = await fetchSource(GAMES_URL);
  assertHeader(sourceContract('games'), parseCsvHeader(csv), loggedNewColumns);
  const { games } = toScheduleAndGameRows(parseCsv(csv), resolveTeamCode, 1999);
  return buildGameIndex(games);
}

function buildTarget(args: Args): StatFileTarget {
  if (args.target === 'fs') return new FileSystemStatFileTarget(resolve(args.out));
  if (args.bucket) process.env.R2_BUCKET = args.bucket;
  return r2StatFileTargetFromEnv();
}

/** The run's `ingestion_runs` row, when this process has database credentials. */
async function recordRun(run: {
  startedAt: string;
  status: 'success' | 'partial' | 'failure';
  uploaded: number;
  errors: Record<string, unknown>;
}): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('ingestion_runs').insert({
    source: 'stat-files',
    started_at: run.startedAt,
    finished_at: new Date().toISOString(),
    status: run.status,
    teams_written: run.uploaded,
    errors: run.errors as Database['public']['Tables']['ingestion_runs']['Insert']['errors'],
  });
  if (error) console.error(`failed to record ingestion_runs: ${error.message}`);
}

function coverageSources(): ManifestSources {
  const sources: ManifestSources = {};
  for (const [source, counts] of [...coverage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sources[source] = {
      min_season: counts.min,
      max_season: counts.max,
      crosswalk_misses: counts.unresolved,
    };
  }
  return sources;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const state = nflSeasonState();
  const { completedSeason } = state;
  // The daily window: the live (or upcoming) season plus the one just completed, whose
  // corrections nflverse keeps publishing.
  const seasons =
    args.seasons ??
    [...new Set([completedSeason, currentSeasonOf(state)])].filter((s) => s >= 1999).sort();
  const expectedSeasons = Array.from({ length: completedSeason - 1999 + 1 }, (_, i) => 1999 + i);
  const startedAt = new Date().toISOString();
  console.log(
    `building stat files for ${seasons.join(', ')} into ${args.target === 'r2' ? `r2 bucket ${args.bucket ?? process.env.R2_BUCKET}` : resolve(args.out)}` +
      (args.fromRaw ? ' (from the raw archive)' : '')
  );

  const target = buildTarget(args);
  fetchSource = createSourceFetcher({
    archive: createRawArchive(target),
    fromRaw: args.fromRaw,
    fetchLive: getText,
    headerColumns: parseCsvHeader,
    releaseUpdatedAt,
  });

  try {
    const playersCsv = await fetchSource(assetUrl(PLAYERS_TAG, PLAYERS_FILE));
    const playerRows = parseCsv(playersCsv);
    const gsis = buildCrosswalk(playerRows);
    const pfr = buildPfrCrosswalk(playerRows);
    console.log(`crosswalk: ${gsis.size} gsis, ${pfr.size} pfr ids`);

    const loggedNewColumnSources = new Set<string>();
    const gameIndex = args.games ? await loadGameIndex(loggedNewColumnSources) : null;

    const qbrText = await fetchSource(assetUrl('espn_data', 'qbr_week_level.csv'));
    assertHeader(sourceContract('espn_qbr_week'), parseCsvHeader(qbrText), loggedNewColumnSources);
    let qbrCache: PlayerWeekRow[] | null = null;
    const qbrRows = async (): Promise<PlayerWeekRow[]> => {
      if (!qbrCache) {
        const result = toPlayerWeekRows(parseCsv(qbrText), {
          idColumn: 'player_id',
          teamColumn: 'team_abb',
          seasonTypeColumn: 'season_type',
          weekColumn: 'game_week',
          resolveTeam: resolveTeamCode,
        });
        // QBR is one whole-history file, so its coverage is the seasons actually present in
        // it (2006+), not the nominal season the fetch was keyed to. Count the crosswalk
        // misses once.
        const qbrSeasons = [...new Set(result.rows.map((row) => row.season))].sort((a, b) => a - b);
        for (const season of qbrSeasons) recordSource('espn_qbr_week', season, 0);
        if (qbrSeasons.length === 0) recordSource('espn_qbr_week', seasons[0], 0);
        const qbrEntry = coverage.get('espn_qbr_week');
        if (qbrEntry) qbrEntry.unresolved += result.unresolved;
        qbrCache = result.rows;
      }
      return qbrCache;
    };

    const result = await runStatFileBuild({
      target,
      seasons,
      expectedSeasons,
      completedSeason,
      allowShrink: args.allowShrink,
      sources: coverageSources,
      buildSeason: async (season) => {
        const built = await buildSeason(season, {
          latestCompletedSeason: completedSeason,
          gsis,
          pfr,
          loggedNewColumnSources,
          qbrRows,
          gameIndex,
        });
        console.log(
          `${season}: ${built.rows.length} consolidated player rows` +
            (args.games ? `, ${built.games.length} game rows` : '')
        );
        return built;
      },
    });

    for (const violation of result.overridden) console.log(`allowed shrink: ${violation.message}`);
    console.log(
      `published ${result.uploaded} objects, skipped ${result.skipped} unchanged, ` +
        `${result.playerFiles} player files, ${result.gameFiles} game files`
    );
    await recordRun({
      startedAt,
      status: result.overridden.length ? 'partial' : 'success',
      uploaded: result.uploaded,
      errors: {
        seasons,
        uploaded: result.uploaded,
        skipped: result.skipped,
        crosswalk_misses: Object.fromEntries(
          Object.entries(coverageSources()).map(([source, c]) => [source, c.crosswalk_misses])
        ),
        allowed_shrink: result.overridden.map((violation) => violation.message),
      },
    });
  } catch (error) {
    await recordRun({
      startedAt,
      status: 'failure',
      uploaded: 0,
      errors: { seasons, failure: (error as Error).message },
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(
    error instanceof MissingCheckpointError || error instanceof ShrinkGuardError
      ? error.message
      : error
  );
  process.exit(1);
});
