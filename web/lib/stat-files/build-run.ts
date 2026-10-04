// One stat-file build, start to finish, with the I/O injected. The order is the contract:
//
//   1. every season outside the rebuild window must already have a checkpoint in the target
//      (a career ledger assembled without one would silently drop that season);
//   2. each rebuilt season is built, compared with the checkpoint it replaces, and staged in
//      memory, never in the target;
//   3. career ledgers are assembled from the staged and stored checkpoints;
//   4. only after all of that succeeds is anything uploaded.
//
// Any failure before step 4 therefore leaves the target serving the last good files.

import { gunzipSync } from 'node:zlib';
import {
  manifestKey,
  playerGamesKey,
  playerSeasonsKey,
  seasonCheckpointKey,
  STAT_FILES_SCHEMA_VERSION,
  teamCheckpointKey,
  teamSeasonsKey,
} from './layout';
import { buildPlayerGamesFiles, type PlayerGameRow } from './player-games';
import {
  buildPlayerSeasonsFile,
  type PlayerSeasonRow,
  type SeasonCheckpoint,
} from './player-seasons';
import { createPublisher, type StatFileTarget, type StatFilesManifest } from './publish';
import { checkSeasonShrink, checkTeamSeasonShrink, type ShrinkViolation } from './shrink-guard';
import { MemoryStatFileTarget } from './targets';
import { buildTeamFiles, type TeamGameRow, type TeamSeasonCheckpoint } from './team-seasons';

export type ManifestSources = StatFilesManifest['sources'];

export interface SeasonBuild {
  rows: PlayerSeasonRow[];
  games: PlayerGameRow[];
}

/** Concurrent uploads in flight during the publish phase. */
export const UPLOAD_CONCURRENCY = 32;

/** Runs `task` over `items` with at most `limit` in flight; the first failure rejects. */
async function runPool<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export class MissingCheckpointError extends Error {
  constructor(readonly seasons: number[]) {
    super(
      `no checkpoint for season(s) ${seasons.join(', ')}; ` +
        `backfill them first: npm run stat-files:build -- --seasons ${seasonRange(seasons)} ` +
        `--target r2 --bucket <bucket>`
    );
  }
}

export class ShrinkGuardError extends Error {
  constructor(readonly violations: ShrinkViolation[]) {
    super(
      `shrink guard tripped, nothing uploaded:\n${violations.map((v) => `  ${v.message}`).join('\n')}\n` +
        'investigate the source; --allow-shrink <season> overrides one season'
    );
  }
}

function seasonRange(seasons: number[]): string {
  const sorted = [...seasons].sort((a, b) => a - b);
  return sorted.length === 1 ? String(sorted[0]) : `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

async function readJson<T>(target: StatFileTarget, key: string): Promise<T | null> {
  const raw = await target.get(key);
  if (!raw) return null;
  return JSON.parse(gunzipSync(Buffer.from(raw)).toString('utf8')) as T;
}

/** Folds this run's source coverage over the published manifest, so a daily window never narrows it. */
export function mergeManifestSources(
  previous: ManifestSources,
  next: ManifestSources
): ManifestSources {
  const merged: ManifestSources = { ...previous };
  for (const [source, counts] of Object.entries(next)) {
    const before = previous[source];
    const min = [before?.min_season, counts.min_season].filter(
      (s): s is number => s !== null && s !== undefined
    );
    const max = [before?.max_season, counts.max_season].filter(
      (s): s is number => s !== null && s !== undefined
    );
    merged[source] = {
      min_season: min.length ? Math.min(...min) : null,
      max_season: max.length ? Math.max(...max) : null,
      crosswalk_misses: counts.crosswalk_misses,
    };
  }
  return merged;
}

export interface TeamBuildOptions {
  /** Every season the team source publishes up to the completed one. */
  expectedSeasons: number[];
  buildSeason: (season: number) => Promise<TeamGameRow[]>;
}

export interface BuildRunOptions {
  target: StatFileTarget;
  /** Seasons to rebuild from source. */
  seasons: number[];
  /** Every season a complete career needs, rebuilt or not. */
  expectedSeasons: number[];
  /** Calendar-completed season; later seasons are in progress and may only grow. */
  completedSeason: number;
  buildSeason: (season: number) => Promise<SeasonBuild>;
  /** Source coverage accumulated by `buildSeason`, read after every season is built. */
  sources: () => ManifestSources;
  /** Seasons whose shrink violations are recorded instead of blocking the publish. */
  allowShrink?: readonly number[];
  /**
   * Team files, built beside the player files and published in the same all-or-nothing
   * upload. A season without a stored team checkpoint is built from source rather than
   * failing the run, since the team source is one small file per season.
   */
  teams?: TeamBuildOptions;
  now?: () => Date;
}

export interface BuildRunResult {
  uploaded: number;
  skipped: number;
  playerFiles: number;
  gameFiles: number;
  teamFiles: number;
  /** Violations an `--allow-shrink` override let through. */
  overridden: ShrinkViolation[];
}

export async function runStatFileBuild(opts: BuildRunOptions): Promise<BuildRunResult> {
  const { target, seasons, completedSeason } = opts;
  const rebuilt = new Set(seasons);

  const stored = new Map<number, PlayerSeasonRow[]>();
  const missing: number[] = [];
  for (const season of opts.expectedSeasons) {
    if (rebuilt.has(season)) continue;
    const checkpoint = await readJson<SeasonCheckpoint>(target, seasonCheckpointKey(season));
    if (checkpoint) stored.set(season, checkpoint.rows);
    else missing.push(season);
  }
  if (missing.length) throw new MissingCheckpointError(missing);

  const staging = new MemoryStatFileTarget();
  const stager = await createPublisher(staging, { currentSeason: completedSeason });
  const allowed = new Set(opts.allowShrink ?? []);
  const overridden: ShrinkViolation[] = [];
  const blocking: ShrinkViolation[] = [];
  let gameFiles = 0;

  for (const season of seasons) {
    const { rows, games } = await opts.buildSeason(season);
    const previous = await readJson<SeasonCheckpoint>(target, seasonCheckpointKey(season));
    const violations = checkSeasonShrink({
      season,
      previous: previous?.rows ?? null,
      next: rows,
      inProgress: season > completedSeason,
    });
    (allowed.has(season) ? overridden : blocking).push(...violations);

    stored.set(season, rows);
    await stager.put(seasonCheckpointKey(season), {
      schema_version: STAT_FILES_SCHEMA_VERSION,
      season,
      rows,
    } satisfies SeasonCheckpoint);
    for (const [playerId, file] of buildPlayerGamesFiles(
      season,
      games,
      STAT_FILES_SCHEMA_VERSION
    )) {
      await stager.put(playerGamesKey(playerId, season), file);
      gameFiles++;
    }
  }

  let teamFiles = 0;
  if (opts.teams) {
    const { expectedSeasons, buildSeason } = opts.teams;
    const rowsBySeason = new Map<number, TeamGameRow[]>();
    const toBuild: number[] = [];
    for (const season of expectedSeasons) {
      const checkpoint = rebuilt.has(season)
        ? null
        : await readJson<TeamSeasonCheckpoint>(target, teamCheckpointKey(season));
      if (checkpoint) rowsBySeason.set(season, checkpoint.rows);
      else toBuild.push(season);
    }
    for (const season of toBuild) {
      const rows = await buildSeason(season);
      const previous = await readJson<TeamSeasonCheckpoint>(target, teamCheckpointKey(season));
      const violations = checkTeamSeasonShrink({
        season,
        previous: previous?.rows ?? null,
        next: rows,
        inProgress: season > completedSeason,
      });
      (allowed.has(season) ? overridden : blocking).push(...violations);
      rowsBySeason.set(season, rows);
      await stager.put(teamCheckpointKey(season), {
        schema_version: STAT_FILES_SCHEMA_VERSION,
        season,
        rows,
      } satisfies TeamSeasonCheckpoint);
    }
    for (const [teamId, file] of [...buildTeamFiles(rowsBySeason, STAT_FILES_SCHEMA_VERSION)].sort(
      ([a], [b]) => a.localeCompare(b)
    )) {
      await stager.put(teamSeasonsKey(teamId), file);
      teamFiles++;
    }
  }
  if (blocking.length) throw new ShrinkGuardError(blocking);

  const byPlayer = new Map<string, PlayerSeasonRow[]>();
  for (const season of [...stored.keys()].sort((a, b) => a - b)) {
    for (const row of stored.get(season) ?? []) {
      const list = byPlayer.get(row.player_id) ?? [];
      list.push(row);
      byPlayer.set(row.player_id, list);
    }
  }
  for (const [playerId, rows] of [...byPlayer].sort(([a], [b]) => a.localeCompare(b))) {
    await stager.put(
      playerSeasonsKey(playerId),
      buildPlayerSeasonsFile(playerId, rows, STAT_FILES_SCHEMA_VERSION)
    );
  }

  const previousManifest = await readJson<StatFilesManifest>(target, manifestKey());
  await stager.writeManifest({
    generated_at: (opts.now?.() ?? new Date()).toISOString(),
    sources: mergeManifestSources(previousManifest?.sources ?? {}, opts.sources()),
  });

  // Everything is built and guarded: upload. The manifest goes last, so a reader never
  // sees coverage advertised for files that haven't landed.
  const publisher = await createPublisher(target, { currentSeason: completedSeason });
  const stagedKeys = staging.keys().filter((key) => !key.endsWith('/publish-index.json'));
  const manifest = manifestKey();
  const upload = async (key: string): Promise<void> => {
    const gz = await staging.get(key);
    if (gz) await publisher.putEncoded(key, gunzipSync(Buffer.from(gz)), gz);
  };
  // A full backfill is ~63k small objects; one request at a time is hours of round trips.
  await runPool(
    stagedKeys.filter((key) => key !== manifest),
    UPLOAD_CONCURRENCY,
    upload
  );
  await upload(manifest);
  await publisher.flush();

  return {
    uploaded: publisher.uploaded,
    skipped: publisher.skipped,
    playerFiles: byPlayer.size,
    gameFiles,
    teamFiles,
    overridden,
  };
}
