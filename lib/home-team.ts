// Startup-team resolution (Phase C, auth pass 1). Pure: given a signed-in user's saved
// settings, decide which team the home route opens to. Precedence is favorite ->
// last-viewed -> default. Every candidate is validated against the live team ids so a
// stale setting (team removed/renamed between deploys) falls through instead of 404ing —
// the same defensive posture the retired localStorage-based 5a helper used.

export type UserSettings = {
  favoriteTeamId: string | null;
  lastTeamId: string | null;
};

export function resolveStartupTeam(
  settings: UserSettings | null,
  validIds: readonly string[],
  defaultId: string
): string {
  const favorite = settings?.favoriteTeamId;
  if (favorite && validIds.includes(favorite)) return favorite;
  const last = settings?.lastTeamId;
  if (last && validIds.includes(last)) return last;
  return defaultId;
}
