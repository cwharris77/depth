import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerHit } from '../search';

const { ilikeCalls, queryCounts } = vi.hoisted(() => ({
  ilikeCalls: [] as Array<[string, string]>,
  queryCounts: { total: 0 },
}));

// Search is DB-touching but the query wiring is what this ticket is about (input must be
// escaped before it reaches a LIKE pattern, and repeated queries must not re-query), so
// mock the supabase client with a recording chain instead of hitting Postgres. This keeps
// the assertions runnable without env vars, unlike the live tests in
// roster-source.db.test.ts. `total` counts every resolved query so a cache hit (no new
// query) is observable.
vi.mock('@supabase/supabase-js', () => {
  function buildChain() {
    const chain = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      in() {
        return chain;
      },
      ilike(col: string, value: string) {
        ilikeCalls.push([col, value]);
        return chain;
      },
      limit() {
        return chain;
      },
      returns() {
        return chain;
      },
      then(resolve: (value: { data: unknown[]; error: null }) => void) {
        queryCounts.total += 1;
        resolve({ data: [], error: null });
        return chain;
      },
    };
    return chain;
  }
  return { createClient: () => ({ from: () => buildChain() }) };
});

let searchAllPlayers: (query: string, limit?: number) => Promise<PlayerHit[]>;

describe('searchAllPlayers (mocked client)', () => {
  // supabase() (lib/roster-source.db.ts) throws unless both env vars are present, before
  // createClient is ever reached — this file's worker process sets them so the guard
  // passes and the mock above is what actually runs. Isolated to this file (vitest gives
  // each test file its own worker), so the live-DB tests elsewhere keep their skip logic.
  beforeAll(() => {
    vi.stubEnv('SUPABASE_URL', 'http://localhost');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'mock-key');
  });

  // searchAllPlayers keeps a module-scoped result cache; resetModules + a fresh dynamic
  // import gives every test a clean cache so cache-key expectations don't leak across
  // cases (vi.mock above still applies to each fresh module instance).
  beforeEach(async () => {
    vi.resetModules();
    ({ searchAllPlayers } = await import('../roster-source.db'));
    ilikeCalls.length = 0;
    queryCounts.total = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('escapes LIKE wildcards in every pattern built from user input', async () => {
    await searchAllPlayers('100%_o');
    expect(ilikeCalls).toEqual([
      ['name', '%100\\%\\_o%'],
      ['college', '%100\\%\\_o%'],
      ['position', '100\\%\\_o'],
    ]);
  });

  it('returns [] for empty, whitespace-only, or overlong input without touching the DB', async () => {
    expect(await searchAllPlayers('')).toEqual([]);
    expect(await searchAllPlayers('   ')).toEqual([]);
    expect(await searchAllPlayers('x'.repeat(31))).toEqual([]);
    expect(queryCounts.total).toBe(0);
  });

  it('serves a repeated identical query from cache without querying the DB again', async () => {
    await searchAllPlayers('geno');
    const afterFirst = queryCounts.total;
    expect(afterFirst).toBeGreaterThan(0);
    await searchAllPlayers('geno');
    expect(queryCounts.total).toBe(afterFirst);
  });

  it('normalizes whitespace so equivalent queries share one cache entry', async () => {
    await searchAllPlayers('geno  smith');
    const afterFirst = queryCounts.total;
    await searchAllPlayers('  geno smith  ');
    expect(queryCounts.total).toBe(afterFirst);
  });

  it('keeps limit and query distinct in the cache key', async () => {
    await searchAllPlayers('geno', 8);
    const afterFirst = queryCounts.total;
    expect(afterFirst).toBeGreaterThan(0);
    await searchAllPlayers('geno', 50);
    expect(queryCounts.total).toBeGreaterThan(afterFirst);
  });

  it('refetches once the cache TTL expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    await searchAllPlayers('geno');
    const afterFirst = queryCounts.total;
    expect(afterFirst).toBeGreaterThan(0);
    vi.advanceTimersByTime(59_999);
    await searchAllPlayers('geno');
    expect(queryCounts.total).toBe(afterFirst);
    vi.advanceTimersByTime(2);
    await searchAllPlayers('geno');
    expect(queryCounts.total).toBeGreaterThan(afterFirst);
  });
});
