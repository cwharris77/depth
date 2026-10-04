import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  mergeManifestSources,
  MissingCheckpointError,
  runStatFileBuild,
  UPLOAD_CONCURRENCY,
  ShrinkGuardError,
  type SeasonBuild,
} from './build-run';
import { manifestKey, playerSeasonsKey, seasonCheckpointKey } from './layout';
import type { PlayerGameRow } from './player-games';
import type { PlayerSeasonRow } from './player-seasons';
import type { StatFileHeaders, StatFileTarget } from './publish';
import { MemoryStatFileTarget } from './targets';

/** A memory target that records every `put`, so a test can assert nothing was uploaded. */
class RecordingTarget extends MemoryStatFileTarget {
  puts: string[] = [];
  override async put(key: string, body: Uint8Array, headers: StatFileHeaders): Promise<void> {
    this.puts.push(key);
    await super.put(key, body, headers);
  }
}

function seasonRows(season: number, players: number): PlayerSeasonRow[] {
  return Array.from({ length: players }, (_, i) => ({
    player_id: `p${i}`,
    season,
    season_type: 'REG' as const,
    team: 'bills',
    box: { passing_yards: season + i },
    pfr: { carries: i },
  }));
}

function gameRows(season: number, players: number): PlayerGameRow[] {
  return seasonRows(season, players).map((row) => ({
    player_id: row.player_id,
    season,
    season_type: 'REG' as const,
    week: 1,
    team: row.team,
    box: { passing_yards: 1 },
  }));
}

const SOURCES = { stats_player_week: { min_season: 2023, max_season: 2025, crosswalk_misses: 0 } };

function options(
  target: StatFileTarget,
  seasons: number[],
  build: (season: number) => Promise<SeasonBuild> = async (season) => ({
    rows: seasonRows(season, 20),
    games: gameRows(season, 20),
  }),
  extra: Partial<Parameters<typeof runStatFileBuild>[0]> = {}
) {
  return {
    target,
    seasons,
    expectedSeasons: [2023, 2024, 2025],
    completedSeason: 2025,
    buildSeason: build,
    sources: () => SOURCES,
    now: () => new Date('2026-01-01T00:00:00Z'),
    ...extra,
  };
}

const body = async (target: StatFileTarget, key: string) =>
  gunzipSync(Buffer.from((await target.get(key))!)).toString('utf8');

describe('runStatFileBuild', () => {
  it('publishes season ledgers, game logs, checkpoints and the manifest', async () => {
    const target = new RecordingTarget();
    const result = await runStatFileBuild(options(target, [2023, 2024, 2025]));
    expect(result.playerFiles).toBe(20);
    expect(result.gameFiles).toBe(60);
    expect(target.puts).toContain(playerSeasonsKey('p0'));
    expect(target.puts).toContain(seasonCheckpointKey(2024));
    expect(target.puts[target.puts.length - 2]).toBe(manifestKey());
  });

  it('uploads concurrently but never starts the manifest before the other objects finish', async () => {
    let inFlight = 0;
    let peak = 0;
    let finished = 0;
    let manifestStartedAfter = -1;
    class SlowTarget extends RecordingTarget {
      override async put(key: string, body: Uint8Array, headers: StatFileHeaders): Promise<void> {
        if (key === manifestKey()) manifestStartedAfter = finished;
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight--;
        finished++;
        await super.put(key, body, headers);
      }
    }
    const target = new SlowTarget();
    await runStatFileBuild(options(target, [2023, 2024, 2025]));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(UPLOAD_CONCURRENCY);
    expect(manifestStartedAfter).toBe(target.puts.length - 2);
  });

  it('fails naming the backfill command when a needed checkpoint is missing, uploading nothing', async () => {
    const target = new RecordingTarget();
    await runStatFileBuild(options(target, [2023, 2024, 2025]));
    const bare = new RecordingTarget();
    await expect(runStatFileBuild(options(bare, [2025]))).rejects.toThrow(MissingCheckpointError);
    await expect(runStatFileBuild(options(bare, [2025]))).rejects.toThrow(
      /--seasons 2023-2024 --target r2/
    );
    expect(bare.puts).toEqual([]);
  });

  it('rebuilds a daily window from stored checkpoints to the same ledgers as a full build', async () => {
    const full = new RecordingTarget();
    await runStatFileBuild(options(full, [2023, 2024, 2025]));
    const before = await body(full, playerSeasonsKey('p3'));

    full.puts = [];
    const daily = await runStatFileBuild(options(full, [2025]));

    expect(await body(full, playerSeasonsKey('p3'))).toBe(before);
    expect(full.puts.filter((key) => key.includes('/players/'))).toEqual([]);
    expect(daily.uploaded).toBe(0);
  });

  it('uploads zero objects when a season fails to build', async () => {
    const target = new RecordingTarget();
    await expect(
      runStatFileBuild(
        options(target, [2023, 2024, 2025], async (season) => {
          if (season === 2025) throw new Error('missing required column');
          return { rows: seasonRows(season, 20), games: [] };
        })
      )
    ).rejects.toThrow('missing required column');
    expect(target.puts).toEqual([]);
  });

  it('uploads zero objects when the shrink guard trips', async () => {
    const target = new RecordingTarget();
    await runStatFileBuild(options(target, [2023, 2024, 2025]));
    target.puts = [];

    await expect(
      runStatFileBuild(
        options(target, [2024], async (season) => ({ rows: seasonRows(season, 10), games: [] }))
      )
    ).rejects.toThrow(ShrinkGuardError);
    expect(target.puts).toEqual([]);
  });

  it('lets --allow-shrink override only the named season', async () => {
    const target = new RecordingTarget();
    await runStatFileBuild(options(target, [2023, 2024, 2025]));
    target.puts = [];
    const shrunk = async (season: number) => ({ rows: seasonRows(season, 10), games: [] });

    const result = await runStatFileBuild(options(target, [2024], shrunk, { allowShrink: [2024] }));
    expect(result.overridden.length).toBeGreaterThan(0);
    expect(target.puts).toContain(seasonCheckpointKey(2024));

    await expect(
      runStatFileBuild(options(target, [2023, 2024], shrunk, { allowShrink: [2024] }))
    ).rejects.toThrow(/2023:/);
  });

  it('treats a season after the completed one as in progress, so it may only grow', async () => {
    const target = new RecordingTarget();
    const run = (players: number) =>
      runStatFileBuild(
        options(
          target,
          [2026],
          async (season) => ({ rows: seasonRows(season, players), games: [] }),
          { expectedSeasons: [2026] }
        )
      );
    await run(20);
    await expect(run(19)).rejects.toThrow(ShrinkGuardError);
    await expect(run(25)).resolves.toBeDefined();
  });
});

describe('mergeManifestSources', () => {
  it('widens coverage and keeps sources a window did not touch', () => {
    expect(
      mergeManifestSources(
        {
          a: { min_season: 1999, max_season: 2024, crosswalk_misses: 5 },
          b: { min_season: 2016, max_season: 2024, crosswalk_misses: 1 },
        },
        { a: { min_season: 2025, max_season: 2025, crosswalk_misses: 2 } }
      )
    ).toEqual({
      a: { min_season: 1999, max_season: 2025, crosswalk_misses: 2 },
      b: { min_season: 2016, max_season: 2024, crosswalk_misses: 1 },
    });
  });
});
