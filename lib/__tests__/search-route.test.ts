import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { searchAllPlayers } from '@/lib/roster-source.db';
import { searchRateLimiter } from '@/app/api/players/search/route';

vi.mock('@/lib/roster-source.db', () => ({
  searchAllPlayers: vi.fn(),
}));

import { GET } from '@/app/api/players/search/route';

const mockedSearch = vi.mocked(searchAllPlayers);

function makeRequest(q: string | null): NextRequest {
  const url =
    q === null
      ? 'http://localhost/api/players/search'
      : `http://localhost/api/players/search?q=${encodeURIComponent(q)}`;
  return new NextRequest(url, { headers: { 'x-forwarded-for': '203.0.113.7' } });
}

describe('GET /api/players/search', () => {
  beforeEach(() => {
    searchRateLimiter.reset();
    mockedSearch.mockReset();
    mockedSearch.mockResolvedValue([]);
  });

  it('rejects an empty query with 400 before any DB work', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('rejects a missing q param with 400', async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it('rejects whitespace-only input with 400', async () => {
    const res = await GET(makeRequest('   '));
    expect(res.status).toBe(400);
  });

  it('rejects an overlong query with 400', async () => {
    const res = await GET(makeRequest('x'.repeat(31)));
    expect(res.status).toBe(400);
  });

  it('accepts a query at the length cap and passes the normalized form through', async () => {
    const res = await GET(makeRequest('  geno  smith  '));
    expect(res.status).toBe(200);
    expect(mockedSearch).toHaveBeenCalledWith('geno smith');
  });

  it('returns 500 when the DB layer throws', async () => {
    mockedSearch.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(makeRequest('geno'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ results: [] });
  });

  it('enforces the per-client rate limit with 429', async () => {
    // 180 allowed hits in the window, then the burst is stopped. The search function is
    // mocked so this exercises the limiter, not the DB.
    for (let i = 0; i < 180; i++) {
      const res = await GET(makeRequest('geno'));
      expect(res.status).toBe(200);
    }
    const blocked = await GET(makeRequest('geno'));
    expect(blocked.status).toBe(429);
    expect(mockedSearch).toHaveBeenCalledTimes(180);
  });
});
