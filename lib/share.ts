import type { TeamDepthOverride } from './depth-overrides';

// A shareable deep link to one player. The team page reads `?player=<id>` and opens
// that player once its roster loads (see components/OpenPlayerFromQuery), so this is
// the same clean path the canonical URL points at — no separate per-player route.
// Returns a root-relative path; callers prepend the origin for an absolute URL.
export function playerDeepLinkPath(teamId: string, playerId: string): string {
  return `/team/${encodeURIComponent(teamId)}?player=${encodeURIComponent(playerId)}`;
}

// --- shareable custom depth order ------------------------------------------------
//
// A user's depth-chart edits live only in their own localStorage (lib/depth-overrides).
// To share a roster "exactly as edited" without a backend, we pack the override into
// the share link itself: base64url(JSON) in an `?order=` param. The destination decodes
// it and applies it (components/ApplySharedOrder). A real per-user store replaces this
// once there's auth.

function base64UrlEncode(s: string): string {
  const b64 = typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString();
}

export function encodeDepthOrder(override: TeamDepthOverride): string {
  return base64UrlEncode(JSON.stringify(override));
}

// Parse an `?order=` param back into an override. Returns null (not a throw) on any
// malformed input, and validates the shape — a share link is untrusted input, so a
// bad value must degrade to "no shared order" rather than corrupt the saved store.
export function decodeDepthOrder(param: string): TeamDepthOverride | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(param));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    for (const value of Object.values(parsed)) {
      if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) {
        return null;
      }
    }
    return parsed as TeamDepthOverride;
  } catch {
    return null;
  }
}

// The share URL for a team's roster as it currently stands. With no edits it's the
// clean team path; with edits it carries the packed order. `kitId` is the picked
// uniform (Phase 7 launch spec's "Share integration" decision) — omit it (or pass the
// Home kit's id) to leave the link kit-less; ApplyKitFromQuery applies it on arrival.
// Root-relative; callers prepend the origin.
export function rosterShareUrlPath(
  teamId: string,
  override: TeamDepthOverride,
  kitId?: string
): string {
  const base = `/team/${encodeURIComponent(teamId)}`;
  const params: string[] = [];
  if (override && Object.keys(override).length > 0) {
    // encodeDepthOrder is base64url — already URL-safe, no further escaping needed.
    params.push(`order=${encodeDepthOrder(override)}`);
  }
  if (kitId) {
    params.push(`kit=${encodeURIComponent(kitId)}`);
  }
  if (params.length === 0) return base;
  return `${base}?${params.join('&')}`;
}
