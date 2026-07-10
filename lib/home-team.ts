// Startup-team resolution (Phase C, auth pass 1). Pure: given a signed-in user's saved
// settings, decide which team the home route opens to. Precedence is favorite ->
// last-viewed -> default. Every candidate is validated against the live team ids so a
// stale setting (team removed/renamed between deploys) falls through instead of 404ing —
// the same defensive posture the retired localStorage-based 5a helper used.

export type UserSettings = {
  favoriteTeamId: string | null;
  lastTeamId: string | null;
  // Whether to open the favorite at startup. Only consulted when favoriteTeamId is set;
  // off means startup falls back to last-viewed like a user with no favorite.
  startOnFavorite: boolean;
};

export function resolveStartupTeam(
  settings: UserSettings | null,
  validIds: readonly string[],
  defaultId: string
): string {
  const favorite = settings?.favoriteTeamId;
  if (settings?.startOnFavorite && favorite && validIds.includes(favorite)) return favorite;
  const last = settings?.lastTeamId;
  if (last && validIds.includes(last)) return last;
  return defaultId;
}
