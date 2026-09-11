// In-memory sliding-window rate limiter for the public player-search route
// (app/api/players/search/route.ts). That route is unauthenticated — no auth gate stands
// between a caller and searchAllPlayers' four concurrent ILIKEs — so it needs a hard
// per-client cap on hits independent of the client debounce and the result cache, which
// only absorb *repeated* queries. A sliding window (rather than fixed minutes) lets a
// client that spaces requests evenly use the full budget each window.
//
// Instance-local by design: like the search result cache, this is a backstop against
// scripted bursts, not a volumetric-DDoS defense — that lives at the edge/CDN where the
// request actually arrives.
export interface SlidingWindowLimiter {
  allow(key: string): boolean;
  reset(): void;
}

export interface SlidingWindowOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

// Once the map exceeds this many distinct keys, evict the oldest-inserted bucket. Keys
// are per-client IPs, so a flood of distinct keys is exactly the volumetric case this
// tool doesn't try to solve — the eviction just keeps a per-IP flood from itself growing
// memory without bound.
const MAX_RATE_LIMIT_KEYS = 5_000;

export function createSlidingWindowLimiter(options: SlidingWindowOptions): SlidingWindowLimiter {
  const { windowMs, max } = options;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return {
    allow(key) {
      const ts = now();
      const previous = hits.get(key);
      const fresh = previous ? previous.filter((t) => ts - t < windowMs) : [];
      if (fresh.length >= max) {
        hits.set(key, fresh);
        return false;
      }
      fresh.push(ts);
      hits.set(key, fresh);
      if (hits.size >= MAX_RATE_LIMIT_KEYS) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}
