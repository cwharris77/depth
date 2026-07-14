import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeAuthHandoff, writeAuthHandoff } from '../auth-handoff';

// Minimal in-memory fake of the Cache Storage API (open/put/match/delete), enough to exercise
// the relay's read/write/expiry logic without a browser.
function makeFakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    put: vi.fn(async (key: string, res: Response) => {
      store.set(key, res);
    }),
    match: vi.fn(async (key: string) => store.get(key)),
    delete: vi.fn(async (key: string) => store.delete(key)),
  };
  return { caches: { open: vi.fn(async () => cache) }, store };
}

describe('auth-handoff', () => {
  let originalCaches: unknown;

  beforeEach(() => {
    originalCaches = (globalThis as { caches?: unknown }).caches;
  });

  afterEach(() => {
    (globalThis as { caches?: unknown }).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it('round-trips tokens written and immediately consumed', async () => {
    const { caches } = makeFakeCaches();
    (globalThis as { caches?: unknown }).caches = caches;

    await writeAuthHandoff({ accessToken: 'abc', refreshToken: 'def' });
    await expect(consumeAuthHandoff()).resolves.toEqual({
      accessToken: 'abc',
      refreshToken: 'def',
    });
  });

  it('is single-use — a second consume returns null', async () => {
    const { caches } = makeFakeCaches();
    (globalThis as { caches?: unknown }).caches = caches;

    await writeAuthHandoff({ accessToken: 'abc', refreshToken: 'def' });
    await consumeAuthHandoff();
    await expect(consumeAuthHandoff()).resolves.toBeNull();
  });

  it('returns null when nothing was ever written', async () => {
    const { caches } = makeFakeCaches();
    (globalThis as { caches?: unknown }).caches = caches;

    await expect(consumeAuthHandoff()).resolves.toBeNull();
  });

  it('returns null for an entry older than the freshness window', async () => {
    const { caches, store } = makeFakeCaches();
    (globalThis as { caches?: unknown }).caches = caches;

    const stale = { accessToken: 'abc', refreshToken: 'def', issuedAt: Date.now() - 10 * 60_000 };
    store.set('/__auth_handoff__', new Response(JSON.stringify(stale)));

    await expect(consumeAuthHandoff()).resolves.toBeNull();
  });

  it('returns null for a malformed payload', async () => {
    const { caches, store } = makeFakeCaches();
    (globalThis as { caches?: unknown }).caches = caches;

    store.set('/__auth_handoff__', new Response(JSON.stringify({ accessToken: 1 })));

    await expect(consumeAuthHandoff()).resolves.toBeNull();
  });

  it('degrades to a no-op when Cache Storage is unavailable', async () => {
    (globalThis as { caches?: unknown }).caches = undefined;

    await expect(
      writeAuthHandoff({ accessToken: 'abc', refreshToken: 'def' })
    ).resolves.toBeUndefined();
    await expect(consumeAuthHandoff()).resolves.toBeNull();
  });
});
