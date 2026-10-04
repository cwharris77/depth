import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createRawArchive, createSourceFetcher, rawLocationForUrl } from './raw-archive';
import { MemoryStatFileTarget } from './targets';

const RELEASE = 'https://github.com/nflverse/nflverse-data/releases/download';

describe('rawLocationForUrl', () => {
  it('keys a release asset by tag and the season in its file name', () => {
    expect(rawLocationForUrl(`${RELEASE}/stats_player/stats_player_week_2024.csv`)).toEqual({
      source: 'stats_player',
      season: 2024,
      asset: 'stats_player_week_2024.csv',
    });
    expect(rawLocationForUrl(`${RELEASE}/nextgen_stats/ngs_2024_passing.csv.gz`)).toEqual({
      source: 'nextgen_stats',
      season: 2024,
      asset: 'ngs_2024_passing.csv',
    });
  });

  it('files whole-history sources under all', () => {
    expect(rawLocationForUrl(`${RELEASE}/players/players.csv`).season).toBe('all');
    expect(
      rawLocationForUrl('https://github.com/nflverse/nfldata/raw/master/data/games.csv')
    ).toEqual({ source: 'nfldata', season: 'all', asset: 'games.csv' });
  });

  it('rejects a URL outside the known sources', () => {
    expect(() => rawLocationForUrl('https://example.com/x.csv')).toThrow();
  });
});

describe('raw archive', () => {
  const url = `${RELEASE}/snap_counts/snap_counts_2024.csv`;
  const info = { headerColumns: ['season', 'week'] };

  it('stores the text gzipped with a meta file and reads it back', async () => {
    const target = new MemoryStatFileTarget();
    const archive = createRawArchive(target);
    expect(await archive.store(url, 'season,week\n2024,1\n', { ...info, fetchedAt: 't0' })).toBe(
      true
    );
    expect(target.keys()).toEqual([
      '_raw/snap_counts/2024/snap_counts_2024.csv.gz',
      '_raw/snap_counts/2024/snap_counts_2024.csv.meta.json',
    ]);
    const gz = await target.get('_raw/snap_counts/2024/snap_counts_2024.csv.gz');
    expect(gunzipSync(Buffer.from(gz!)).toString()).toBe('season,week\n2024,1\n');
    expect(await archive.read(url)).toBe('season,week\n2024,1\n');
    const meta = JSON.parse(
      Buffer.from(
        (await target.get('_raw/snap_counts/2024/snap_counts_2024.csv.meta.json'))!
      ).toString()
    );
    expect(meta).toMatchObject({ url, fetched_at: 't0', header_columns: ['season', 'week'] });
  });

  it('skips the upload when the bytes are unchanged and rewrites when they change', async () => {
    const target = new MemoryStatFileTarget();
    const archive = createRawArchive(target);
    await archive.store(url, 'a\n1\n', { ...info, fetchedAt: 't0' });
    expect(await archive.store(url, 'a\n1\n', { ...info, fetchedAt: 't1' })).toBe(false);
    expect(await archive.store(url, 'a\n2\n', { ...info, fetchedAt: 't2' })).toBe(true);
    expect(await archive.read(url)).toBe('a\n2\n');
  });

  it('returns null for an asset that was never archived', async () => {
    expect(await createRawArchive(new MemoryStatFileTarget()).read(url)).toBeNull();
  });
});

describe('source fetcher', () => {
  const url = `${RELEASE}/snap_counts/snap_counts_2024.csv`;

  it('archives what it fetches, then rebuilds from the archive without the network', async () => {
    const archive = createRawArchive(new MemoryStatFileTarget());
    let live = 0;
    const fetchLive = async () => {
      live++;
      return 'a,b\n1,2\n';
    };
    const headerColumns = (text: string) => text.split('\n')[0].split(',');

    const first = await createSourceFetcher({ archive, fromRaw: false, fetchLive, headerColumns })(
      url
    );
    const pinned = await createSourceFetcher({ archive, fromRaw: true, fetchLive, headerColumns })(
      url
    );

    expect(live).toBe(1);
    expect(pinned).toBe(first);
  });

  it('reports a missing archived asset as a 404', async () => {
    const fetcher = createSourceFetcher({
      archive: createRawArchive(new MemoryStatFileTarget()),
      fromRaw: true,
      fetchLive: async () => {
        throw new Error('network must not be used');
      },
      headerColumns: () => [],
    });
    await expect(fetcher(url)).rejects.toThrow(/^404 /);
  });
});
