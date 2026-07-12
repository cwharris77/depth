// Validates the POST body to /api/auth/set-session. Untrusted client input — degrades to null on
// anything malformed rather than throwing (AGENTS.md invariant 6), so the route can respond 400
// instead of 500. Note: arrays pass `typeof x === 'object'`, so they're excluded explicitly.

export type SetSessionPayload = { accessToken: string; refreshToken: string };

export function parseSetSessionBody(body: unknown): SetSessionPayload | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const { accessToken, refreshToken } = body as Record<string, unknown>;
  if (typeof accessToken !== 'string' || !accessToken) return null;
  if (typeof refreshToken !== 'string' || !refreshToken) return null;
  return { accessToken, refreshToken };
}
