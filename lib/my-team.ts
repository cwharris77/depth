// "My team" persistence (roadmap 5a). Remembers the last team the visitor viewed so
// the home route can reopen it instead of always defaulting to Seattle.

const STORAGE_KEY = "depth:my-team";

// Read the saved team id, or null if none / storage is unavailable (SSR, private mode).
export function getMyTeam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Persist the team id the visitor is currently viewing. Silently no-ops if storage is
// unavailable so a blocked localStorage never breaks navigation.
export function setMyTeam(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore (private mode / quota)
  }
}

// Pure: choose where the home route should send the visitor. Prefer the saved team when
// it's still a real team id; otherwise fall back to the default. Guards against a stale
// saved id (team removed/renamed between deploys) sending the user to a 404.
export function resolveHomeTeam(
  saved: string | null,
  validIds: readonly string[],
  defaultId: string,
): string {
  return saved && validIds.includes(saved) ? saved : defaultId;
}
