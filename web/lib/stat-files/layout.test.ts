import { describe, expect, it } from 'vitest';
import {
  cacheControlFor,
  isBuildKey,
  manifestKey,
  playerGamesKey,
  playerSeasonsKey,
  publishIndexKey,
  seasonCheckpointKey,
} from './layout';

describe('v1 stat-file layout keys', () => {
  it('builds the documented key grammar', () => {
    expect(manifestKey()).toBe('v1/manifest.json');
    expect(playerSeasonsKey('3139477')).toBe('v1/players/3139477/seasons.json');
    expect(playerGamesKey('3139477', 2025)).toBe('v1/players/3139477/games/2025.json');
    expect(seasonCheckpointKey(2025)).toBe('v1/_build/season-rows/2025.json');
    expect(publishIndexKey()).toBe('v1/_build/publish-index.json');
  });

  it('marks only _build keys as private working state', () => {
    expect(isBuildKey(seasonCheckpointKey(2025))).toBe(true);
    expect(isBuildKey(manifestKey())).toBe(false);
    expect(isBuildKey(playerSeasonsKey('1'))).toBe(false);
  });
});

describe('cacheControlFor', () => {
  it('revalidates served objects hourly', () => {
    expect(cacheControlFor(manifestKey(), 2026)).toBe('public, max-age=3600');
    expect(cacheControlFor(playerSeasonsKey('1'), 2026)).toBe('public, max-age=3600');
  });

  it('caches a completed-season game log weekly and the current one hourly', () => {
    expect(cacheControlFor(playerGamesKey('1', 2020), 2026)).toBe('public, max-age=604800');
    expect(cacheControlFor(playerGamesKey('1', 2026), 2026)).toBe('public, max-age=3600');
    expect(cacheControlFor(playerGamesKey('1', 2027), 2026)).toBe('public, max-age=3600');
  });

  it('never caches build checkpoints', () => {
    expect(cacheControlFor(seasonCheckpointKey(2025), 2026)).toBe('no-store');
    expect(cacheControlFor(publishIndexKey(), 2026)).toBe('no-store');
  });
});
