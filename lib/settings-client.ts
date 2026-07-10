// Client helpers for the per-user settings API (Phase C, auth pass 1). Thin fetch
// wrappers over app/api/settings so components don't hand-roll requests. Reads degrade
// to null (signed out / network error); writes are fire-and-forget — the server row is
// the only store, and the next write retries, so a dropped PUT is not worth surfacing.
import type { UserSettings } from '@/lib/home-team';

export async function getSettings(): Promise<UserSettings | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null; // 401 signed out, or a transient error
    return (await res.json()) as UserSettings;
  } catch {
    return null;
  }
}

export async function putSettings(patch: {
  favoriteTeamId?: string | null;
  lastTeamId?: string | null;
  startOnFavorite?: boolean;
}): Promise<void> {
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    // fire-and-forget — ignore
  }
}
