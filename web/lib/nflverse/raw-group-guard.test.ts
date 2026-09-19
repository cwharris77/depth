import { describe, it, expect, vi } from 'vitest';
import { fetchRawGroup, type RawGroup } from './raw-group-guard';
import { sourceContract } from './source-contract';

const COMPLETED = 2025;

interface Task {
  url: string;
  partition?: string;
}

const qbrColumns = sourceContract('espn_qbr_week').columns;

function qbrGroup(season: number): RawGroup<Task> {
  return {
    source: 'espn_qbr_week',
    table: 'espn_qbr_week',
    season,
    tasks: [{ url: 'https://example.test/qbr_week_level.csv' }],
  };
}

const options = (fetchCsv: (url: string) => Promise<string>) => ({
  fetchCsv,
  latestCompletedSeason: COMPLETED,
});

describe('fetchRawGroup (ingest raw-loop guard)', () => {
  it('returns the fetched files when the header matches the contract', async () => {
    const csv = `${qbrColumns.join(',')}\n${qbrColumns.map(() => '1').join(',')}`;
    const result = await fetchRawGroup(
      qbrGroup(2024),
      options(async () => csv)
    );
    expect(result).toEqual({
      status: 'ok',
      fetched: [{ task: expect.objectContaining({ url: expect.any(String) }), csv }],
    });
  });

  it('fails the group, naming the column, when a required column is renamed', async () => {
    const renamed = qbrColumns.map((c, i) => (i === qbrColumns.length - 1 ? `${c}_v2` : c));
    const result = await fetchRawGroup(
      qbrGroup(2024),
      options(async () => `${renamed.join(',')}\n${renamed.map(() => '1').join(',')}`)
    );
    expect(result.status).toBe('failure');
    expect(result).toMatchObject({
      message: expect.stringContaining(qbrColumns[qbrColumns.length - 1]),
    });
  });

  it('fails an in-range 404 with the URL instead of skipping it', async () => {
    const result = await fetchRawGroup(
      { ...qbrGroup(2024), source: 'snap_counts', table: 'snap_counts' },
      options(async (url) => {
        throw new Error(`404 ${url}`);
      })
    );
    expect(result).toEqual({
      status: 'failure',
      message: 'snap_counts: 404 https://example.test/qbr_week_level.csv',
    });
  });

  it('skips a 404 outside the published range and for the in-progress season', async () => {
    const notFound = async (url: string) => {
      throw new Error(`404 ${url}`);
    };
    const old = await fetchRawGroup(
      { ...qbrGroup(2017), source: 'pfr_advstats', table: 'pfr_player_week' },
      options(notFound)
    );
    const current = await fetchRawGroup(
      { ...qbrGroup(2026), source: 'stats_player_regpost', table: 'nflverse_player_season' },
      options(notFound)
    );
    expect(old).toEqual({ status: 'skip' });
    expect(current).toEqual({ status: 'skip' });
  });

  it('does not skip a QBR 404 when a backfill starts before its first season', async () => {
    const result = await fetchRawGroup(
      qbrGroup(1999),
      options(async (url) => {
        throw new Error(`404 ${url}`);
      })
    );
    expect(result.status).toBe('failure');
  });

  it('never invokes a transform: nothing is returned for the caller to write on failure', async () => {
    const fetchCsv = vi.fn(async () => 'not_a_contract_column\n1');
    const result = await fetchRawGroup(qbrGroup(2024), options(fetchCsv));
    expect(result.status).toBe('failure');
    expect('fetched' in result).toBe(false);
  });
});
