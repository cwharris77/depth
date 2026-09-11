import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { forecastSourceSpecs, loadForecastSources } from './source';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('forecast source manifest', () => {
  it('contains games and every team-week season in order', () => {
    const specs = forecastSourceSpecs();

    expect(specs).toHaveLength(16);
    expect(specs[0]).toMatchObject({
      key: 'games',
      season: null,
      url: 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',
      cacheFile: 'games.csv',
    });
    expect(specs.slice(1).map(({ season }) => season)).toEqual(
      Array.from({ length: 15 }, (_, index) => 2011 + index)
    );
    expect(specs.slice(1).every(({ url }) => url.includes('/stats_team/'))).toBe(true);
    expect(specs.at(-1)?.url).toBe(
      'https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2025.csv'
    );
  });
});

describe('loadForecastSources', () => {
  it('loads all sources, hashes exact bytes, and preserves manifest order', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'forecast-source-'));
    tempDirs.push(cacheDir);
    const fetchImpl = async (input: URL | RequestInfo) =>
      new Response(String(input).includes('games.csv') ? 'games-bytes' : 'team-bytes');

    const bundle = await loadForecastSources({ cacheDir, fetchImpl });

    expect(bundle.sources[0]).toMatchObject({
      key: 'games',
      sha256: '2281bc87990df06784cc37642691023234dc12af27efb39253c943d4ec848d10',
      text: 'games-bytes',
    });
    expect(bundle.sources.slice(1).map(({ season }) => season)).toEqual(
      Array.from({ length: 15 }, (_, index) => 2011 + index)
    );
    expect(bundle.games).toBe(bundle.sources[0]);
    expect(bundle.teamWeeks).toEqual(bundle.sources.slice(1));
  });

  it('uses cached bytes unless refresh is true', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'forecast-source-'));
    tempDirs.push(cacheDir);
    const fetchImpl = vi.fn(async () => new Response('first'));

    await loadForecastSources({ cacheDir, fetchImpl });
    fetchImpl.mockImplementation(async () => new Response('second'));
    const cached = await loadForecastSources({ cacheDir, fetchImpl });
    const refreshed = await loadForecastSources({ cacheDir, fetchImpl, refresh: true });

    expect(cached.sources[0].text).toBe('first');
    expect(refreshed.sources[0].text).toBe('second');
    expect(fetchImpl).toHaveBeenCalledTimes(32);
  });

  it('validates HTTP status and non-empty bodies before writing cache files', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'forecast-source-'));
    tempDirs.push(cacheDir);
    const fetchImpl = async () => new Response('', { status: 503 });

    await expect(loadForecastSources({ cacheDir, fetchImpl })).rejects.toThrow(/games/);
    await expect(readdir(cacheDir)).resolves.toEqual([]);

    await expect(
      loadForecastSources({ cacheDir, fetchImpl: async () => new Response('') })
    ).rejects.toThrow(/empty/i);
    await expect(readdir(cacheDir)).resolves.toEqual([]);
  });

  it('writes exact UTF-8 bytes to cache', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'forecast-source-'));
    tempDirs.push(cacheDir);
    await loadForecastSources({
      cacheDir,
      fetchImpl: async () => new Response('café'),
    });

    await expect(readFile(join(cacheDir, 'games.csv'))).resolves.toEqual(Buffer.from('café'));
  });
});
