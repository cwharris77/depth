// A shareable deep link to one player. The team page reads `?player=<id>` and opens
// that player once its roster loads (see components/OpenPlayerFromQuery), so this is
// the same clean path the canonical URL points at — no separate per-player route.
// Returns a root-relative path; callers prepend the origin for an absolute URL.
export function playerDeepLinkPath(teamId: string, playerId: string): string {
  return `/team/${encodeURIComponent(teamId)}?player=${encodeURIComponent(playerId)}`;
}
