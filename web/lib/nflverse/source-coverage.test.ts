import { describe, it, expect } from 'vitest';
import { classifyMissingAsset, isPublishedSeason } from './source-coverage';

// `latestCompletedSeason` is the calendar value (2025 while the 2026 season is in
// progress), never a source's own label.
const COMPLETED = 2025;

describe('classifyMissingAsset', () => {
  it('is an error for an in-range 404 (renamed release asset)', () => {
    expect(classifyMissingAsset('pfr_advstats', 2023, COMPLETED)).toBe('error');
    expect(classifyMissingAsset('snap_counts', 2020, COMPLETED)).toBe('error');
    expect(classifyMissingAsset('stats_player_regpost', 2024, COMPLETED)).toBe('error');
  });

  it('is a skip below the source floor', () => {
    expect(classifyMissingAsset('pfr_advstats', 2017, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('snap_counts', 2011, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('stats_player_regpost', 1998, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('nextgen_stats', 2015, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('ftn_charting', 2021, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('pbp_participation', 2015, COMPLETED)).toBe('skip');
  });

  it('is a skip above a source that stopped publishing', () => {
    expect(classifyMissingAsset('nextgen_stats', 2025, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('nextgen_stats', 2024, COMPLETED)).toBe('error');
  });

  it('is a skip for the in-progress season before its first release', () => {
    expect(classifyMissingAsset('stats_player_regpost', 2026, COMPLETED)).toBe('skip');
    expect(classifyMissingAsset('snap_counts', 2026, COMPLETED)).toBe('skip');
  });

  it('is an error on the floor and ceiling boundaries of a completed range', () => {
    expect(classifyMissingAsset('pfr_advstats', 2018, COMPLETED)).toBe('error');
    expect(classifyMissingAsset('nextgen_stats', 2016, COMPLETED)).toBe('error');
    expect(classifyMissingAsset('snap_counts', 2012, COMPLETED)).toBe('error');
  });

  it('is always an error for a whole-history file, whatever season the run started at', () => {
    expect(classifyMissingAsset('espn_qbr_week', 1999, COMPLETED)).toBe('error');
    expect(classifyMissingAsset('espn_qbr_season', 2026, COMPLETED)).toBe('error');
  });
});

describe('isPublishedSeason', () => {
  it('is bounded by the floor and, for a source that stopped, the ceiling', () => {
    expect(isPublishedSeason('pfr_advstats', 2017)).toBe(false);
    expect(isPublishedSeason('pfr_advstats', 2018)).toBe(true);
    expect(isPublishedSeason('nextgen_stats', 2015)).toBe(false);
    expect(isPublishedSeason('nextgen_stats', 2024)).toBe(true);
    expect(isPublishedSeason('nextgen_stats', 2025)).toBe(false);
    expect(isPublishedSeason('snap_counts', 2011)).toBe(false);
    expect(isPublishedSeason('snap_counts', 2026)).toBe(true);
  });

  it('is always true for a whole-history file', () => {
    expect(isPublishedSeason('espn_qbr_week', 1999)).toBe(true);
  });
});
