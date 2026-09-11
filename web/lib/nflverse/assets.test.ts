import { describe, it, expect, vi } from 'vitest';
import { assetUrl, latestAvailableSeason } from './assets';

describe('assetUrl', () => {
  it('builds a release download URL from tag + file', () => {
    expect(assetUrl('players', 'players.csv')).toBe(
      'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv'
    );
  });
});

describe('latestAvailableSeason', () => {
  it('returns the current year when its asset HEAD-checks ok', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const year = await latestAvailableSeason('player_stats', 'stats_player_reg_', fetchImpl);
    expect(year).toBe(new Date().getUTCFullYear());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('walks back a year when the current year 404s', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      const currentYear = new Date().getUTCFullYear();
      return { ok: !String(url).includes(`${currentYear}.csv`) } as Response;
    });
    const year = await latestAvailableSeason('player_stats', 'stats_player_reg_', fetchImpl);
    expect(year).toBe(new Date().getUTCFullYear() - 1);
  });

  it('returns null when nothing is available within maxYearsBack', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false }) as Response);
    const year = await latestAvailableSeason('player_stats', 'stats_player_reg_', fetchImpl);
    expect(year).toBeNull();
  });

  it('treats a fetch throw as unavailable and keeps walking back', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      const currentYear = new Date().getUTCFullYear();
      if (String(url).includes(`${currentYear}.csv`)) throw new Error('network blip');
      return { ok: true } as Response;
    });
    const year = await latestAvailableSeason('player_stats', 'stats_player_reg_', fetchImpl);
    expect(year).toBe(new Date().getUTCFullYear() - 1);
  });
});
