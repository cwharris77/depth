// iOS Home Screen web apps run in a storage container fully isolated from Safari — no cookies,
// localStorage, or session state crosses between them. Cache Storage is one of the only things
// WebKit shares across the two for the same origin. The magic-link email always opens in Safari
// (Mail never launches an installed home-screen icon), so a session set there is invisible when
// the user manually switches back to the icon. This relay closes that gap: components/AuthConfirm.tsx
// (running in Safari) writes the freshly-issued tokens here; components/AuthHandoffListener.tsx
// (running in the standalone app on next launch) reads and consumes them, then replays the same
// set-session POST to establish its own session. Single-use and time-boxed so a stale or
// already-consumed entry can never replay an old sign-in.

const CACHE_NAME = 'depth-auth-handoff';
const HANDOFF_KEY = '/__auth_handoff__';
const MAX_AGE_MS = 5 * 60 * 1000;

export type AuthHandoffTokens = { accessToken: string; refreshToken: string };

function isFresh(issuedAt: unknown): issuedAt is number {
  return typeof issuedAt === 'number' && Date.now() - issuedAt < MAX_AGE_MS;
}

// Best-effort — Cache Storage requires HTTPS and isn't available in every context. A write
// failure just means the standalone app won't auto-pick-up the session, same as before this
// relay existed (untrusted/absent input degrades, never throws — AGENTS.md invariant 6).
export async function writeAuthHandoff(tokens: AuthHandoffTokens): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const payload = { ...tokens, issuedAt: Date.now() };
    await cache.put(HANDOFF_KEY, new Response(JSON.stringify(payload)));
  } catch {
    // Cache Storage unavailable or write failed — nothing to relay.
  }
}

// Deletes the entry as soon as it's read, whether or not it turns out to be usable, so it's
// single-use no matter what.
export async function consumeAuthHandoff(): Promise<AuthHandoffTokens | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(HANDOFF_KEY);
    if (!match) return null;
    await cache.delete(HANDOFF_KEY);
    const body: unknown = await match.json().catch(() => null);
    if (typeof body !== 'object' || body === null) return null;
    const { accessToken, refreshToken, issuedAt } = body as Record<string, unknown>;
    if (typeof accessToken !== 'string' || !accessToken) return null;
    if (typeof refreshToken !== 'string' || !refreshToken) return null;
    if (!isFresh(issuedAt)) return null;
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}
