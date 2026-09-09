// Retrying fetch for the Supabase read client (lib/roster-source.db.ts's supabase()).
//
// next build prerenders 32 /team/[id] pages, each firing ~5 Supabase queries in
// parallel (~160 burst requests from one worker). Supabase's gateway intermittently
// returns 504/502 under that load; with no retry, one transient timeout on ANY page
// threw through lib/roster-source.db.ts's `if (error) throw` and aborted the entire
// build (recurring Vercel "Error occurred prerendering page" — the 2026-09-09
// /team/bills failure, and a known "sometimes happens" class before it).
//
// This is the same flaky-upstream problem scripts/ingest-espn.mts's getJson already
// solves for ESPN ("a single flaky response doesn't drop a team"): retry a few times
// with backoff. We only retry statuses that are plausibly transient — 408/425/429
// and 5xx — plus network-level throws. A 4xx from PostgREST is a REAL contract
// break (an old SELECT against dropped columns, the 2026-08-24 TestFlight class)
// and must surface immediately, never be masked by retry. The last error propagates
// unmodified if every attempt fails, so a genuinely-down gateway still fails the
// build loudly rather than shipping empty pages.
//
// The fetch implementation is the optional third param (defaults to global fetch)
// purely for tests; supabase-js only ever calls the first two.

/** HTTP statuses worth retrying: request-timeout, too-early, rate-limit, and 5xx upstream errors. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const RETRY_COUNT = 3;
const BACKOFF_MS = 500;

/** Signature-compatible with the fetch supabase-js expects. */
export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * fetch that retries transient failures with linear backoff. Returns the first
 * non-transient Response (success or a real 4xx) or the final error if every
 * attempt was transient. Drops into the Supabase client's `global.fetch` directly.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchImpl: FetchFn = fetch
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
    try {
      const response = await fetchImpl(input, init);
      if (!RETRYABLE_STATUSES.has(response.status)) return response;
      // Drain the body before retrying so the connection is released to the pool —
      // under a ~160-request prerender burst, leaving 5xx bodies unread keeps
      // sockets busy and is exactly how the pool exhausts.
      await response.text();
      lastError = new Error(`transient HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < RETRY_COUNT - 1) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS * (attempt + 1)));
    }
  }
  throw lastError;
}