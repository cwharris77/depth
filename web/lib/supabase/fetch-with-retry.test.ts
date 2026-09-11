// Unit tests for the retrying Supabase fetch (lib/supabase/fetch-with-retry.ts).
// The load-bearing boundary: only transient statuses (408/425/429/5xx) and
// network-level throws retry; a 4xx from PostgREST — a real contract break like the
// 2026-08-24 dropped-column failure — must surface on the first attempt, never be
// masked by retry. Persistent 5xx fails loudly after RETRY_COUNT attempts.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithRetry, RETRY_COUNT, type FetchFn } from './fetch-with-retry';

function response(status: number, body = ''): Response {
  return new Response(body, { status });
}

function fetchMock(...responses: (Response | Error)[]): FetchFn {
  let i = 0;
  const mock = vi.fn<FetchFn>(async () => {
    const next = responses[Math.min(i, responses.length - 1)];
    i++;
    if (next instanceof Error) throw next;
    // Return a FRESH Response each attempt: draining a 5xx body (to release the
    // connection) must not poison the retry, and a real network call never hands back
    // the same Response object twice. clone() also preserves the status.
    return next.clone();
  });
  return mock;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchWithRetry', () => {
  it('returns a 2xx response immediately without retrying', async () => {
    const fetch = fetchMock(response(200, '{}'));
    const result = await fetchWithRetry('https://x', {}, fetch);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns a non-transient 4xx immediately — a contract break is never masked by retry', async () => {
    const fetch = fetchMock(response(400, '{"message":"column does not exist"}'));
    const result = await fetchWithRetry('https://x', {}, fetch);
    expect(result.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a 500 then succeeds on the second attempt', async () => {
    const fetch = fetchMock(response(500, 'gateway error'), response(200, '{}'));
    const result = await fetchWithRetry('https://x', {}, fetch);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries the exact gateway-timeout status seen in the failing build (504)', async () => {
    const fetch = fetchMock(response(504, 'Gateway Timeout'), response(200, '{}'));
    const result = await fetchWithRetry('https://x', {}, fetch);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up and throws after RETRY_COUNT attempts on persistent 5xx', async () => {
    const fetch = fetchMock(response(503, 'unavailable'));
    let error: unknown;
    try {
      await fetchWithRetry('https://x', {}, fetch);
    } catch (e) {
      error = e;
    }
    expect(fetch).toHaveBeenCalledTimes(RETRY_COUNT);
    expect((error as Error).message).toMatch(/transient HTTP 503/);
  });

  it('retries a network-level throw (connection reset) then succeeds', async () => {
    const fetch = fetchMock(new Error('connection reset'), response(200, '{}'));
    const result = await fetchWithRetry('https://x', {}, fetch);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws the last network error when every attempt throws', async () => {
    const fetch = fetchMock(new Error('socket hang up'));
    let error: unknown;
    try {
      await fetchWithRetry('https://x', {}, fetch);
    } catch (e) {
      error = e;
    }
    expect(fetch).toHaveBeenCalledTimes(RETRY_COUNT);
    expect((error as Error).message).toBe('socket hang up');
  });

  it('retries a 429 (rate-limit) — responsive to build-time throttling', async () => {
    const fetch = fetchMock(response(429, 'rate limited'), response(200, '{}'));
    const result = await fetchWithRetry('https://x', {}, fetch);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});