// Builds the per-player career stat files (`v1/players/{espn_id}/seasons.json`) straight
// from nflverse weekly release assets. Not part of `next build`; run by hand or by the
// publish workflow.
//
// Usage (from web/):
//   npm run stat-files:build -- --seasons 1999-2026 --out .stat-files
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

import { readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { assetUrl } from '@/lib/nflverse/assets';
import { parseCsv, parseCsvHeader } from '@/lib/nflverse/csv';
import { buildCrosswalk, buildPfrCrosswalk } from '@/lib/nflverse/crosswalk';
import { assertHeader, sourceContract, type SourceId } from '@/lib/nflverse/source-contract';
import { isPublishedSeason } from '@/lib/nflverse/source-coverage';
import { fetchRawGroup } from '@/lib/nflverse/raw-group-guard';
import { resolveTeamCode } from '@/lib/nflverse/team-codes';
import { parseSeasonsArg } from '@/lib/utils/ingest/seasons-arg';
import { nflSeasonState } from '@/lib/utils/team/season-state';
import {
  seasonCheckpointKey,
  STAT_FILES_SCHEMA_VERSION,
  playerSeasonsKey,
} from '@/lib/stat-files/layout';
import { createPublisher, type StatFilesManifest } from '@/lib/stat-files/publish';
import { FileSystemStatFileTarget } from '@/lib/stat-files/targets';
import {
  buildPlayerSeasonsFile,
  consolidateSeason,
  toPlayerWeekRows,
  type PlayerSeasonRow,
  type PlayerWeekRow,
  type SeasonCheckpoint,
  type WeekRowResult,
} from '@/lib/stat-files/player-seasons';

const PLAYERS_TAG = 'players';
const PLAYERS_FILE = 'players.csv';
const STATS_TAG = 'stats_player';
const SNAP_COUNTS_TAG = 'snap_counts';
const NGS_TAG = 'nextgen_stats';
const PFR_TAG = 'pfr_advstats';

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

function parseArgs(argv: string[]): { seasons: number[] | null; out: string } {
  const outIndex = argv.indexOf('--out');
  return {
    seasons: parseSeasonsArg(argv),
    out: outIndex === -1 ? '.stat-files' : argv[outIndex + 1],
  };
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
      fetchCsv: getText,
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
      fetchCsv: getText,
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
  }
): Promise<PlayerSeasonRow[]> {
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

  return consolidateSeason(season, {
    box: box.rows,
    snaps,
    pfr,
    ngs,
    qbr,
  });
}

async function readCheckpoints(
  target: FileSystemStatFileTarget,
  outDir: string
): Promise<PlayerSeasonRow[]> {
  let files: string[];
  try {
    files = await readdir(resolve(outDir, 'v1', '_build', 'season-rows'));
  } catch {
    return [];
  }
  const rows: PlayerSeasonRow[] = [];
  for (const file of files.sort()) {
    const season = Number(file.replace(/\.json$/, ''));
    if (!Number.isInteger(season)) continue;
    const raw = await target.get(seasonCheckpointKey(season));
    if (!raw) continue;
    const checkpoint = JSON.parse(
      gunzipSync(Buffer.from(raw)).toString('utf8')
    ) as SeasonCheckpoint;
    rows.push(...checkpoint.rows);
  }
  return rows;
}

async function main(): Promise<void> {
  const { seasons: requested, out } = parseArgs(process.argv);
  const { completedSeason } = nflSeasonState();
  const seasons = requested ?? [completedSeason];
  const outDir = resolve(out);
  console.log(
    `building stat files for ${seasons[0]}-${seasons[seasons.length - 1]} into ${outDir}`
  );

  const playersCsv = await getText(assetUrl(PLAYERS_TAG, PLAYERS_FILE));
  const playerRows = parseCsv(playersCsv);
  const gsis = buildCrosswalk(playerRows);
  const pfr = buildPfrCrosswalk(playerRows);
  console.log(`crosswalk: ${gsis.size} gsis, ${pfr.size} pfr ids`);

  const target = new FileSystemStatFileTarget(outDir);
  const publisher = await createPublisher(target, { currentSeason: completedSeason });
  const loggedNewColumnSources = new Set<string>();

  const qbrText = await getText(assetUrl('espn_data', 'qbr_week_level.csv'));
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

  for (const season of seasons) {
    const rows = await buildSeason(season, {
      latestCompletedSeason: completedSeason,
      gsis,
      pfr,
      loggedNewColumnSources,
      qbrRows,
    });
    const checkpoint: SeasonCheckpoint = {
      schema_version: STAT_FILES_SCHEMA_VERSION,
      season,
      rows,
    };
    await publisher.put(seasonCheckpointKey(season), checkpoint);
    console.log(`${season}: ${rows.length} consolidated player rows`);
  }

  // Assemble every player's career from all checkpoints on disk (this run's plus any
  // earlier ones), so a daily run that rebuilt one season still writes full careers.
  const allRows = await readCheckpoints(target, outDir);
  const byPlayer = new Map<string, PlayerSeasonRow[]>();
  for (const row of allRows) {
    const list = byPlayer.get(row.player_id) ?? [];
    list.push(row);
    byPlayer.set(row.player_id, list);
  }
  for (const [playerId, playerRowsForFile] of [...byPlayer.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    await publisher.put(
      playerSeasonsKey(playerId),
      buildPlayerSeasonsFile(playerId, playerRowsForFile, STAT_FILES_SCHEMA_VERSION)
    );
  }

  const sources: StatFilesManifest['sources'] = {};
  for (const [source, counts] of [...coverage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sources[source] = {
      min_season: counts.min,
      max_season: counts.max,
      crosswalk_misses: counts.unresolved,
    };
  }
  await publisher.writeManifest({ generated_at: new Date().toISOString(), sources });
  await publisher.flush();

  console.log(
    `published ${publisher.uploaded} objects, skipped ${publisher.skipped} unchanged, ` +
      `${byPlayer.size} player files`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
