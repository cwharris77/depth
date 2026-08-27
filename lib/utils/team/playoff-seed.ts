// Whether an ESPN standings position means the team actually reached the postseason.
//
// `team_stats.playoff_seed` is ESPN's `playoffseed` stat, which is a team's position
// within its conference (1-16), NOT a playoff seed — a team that missed still gets a
// number (lib/espn/standings.test.ts has a `playoffSeed: 8` fixture). Rendering it as
// "SEED 8" claimed a 5-12 Browns team made the playoffs, which is what this exists to
// prevent. Only positions inside the conference's bracket are real seeds.
//
// The NFL expanded from six playoff teams per conference to seven in 2020; team_stats
// carries seasons back to 2002, so the boundary matters for roughly two-thirds of the
// ingested history.

const SEVEN_TEAM_FIELD_FROM = 2020;

export function playoffSpotsPerConference(season: number): number {
  return season >= SEVEN_TEAM_FIELD_FROM ? 7 : 6;
}

/// True when `seed` is a real postseason seed for that season, false when it is just a
/// standings position. An absent or non-positive seed is not a claim either way — the
/// caller renders "MISSED PLAYOFFS" only for a season it knows is complete.
export function isPlayoffSeed(seed: number | null | undefined, season: number): boolean {
  if (seed === null || seed === undefined || seed <= 0) return false;
  return seed <= playoffSpotsPerConference(season);
}

// ESPN writes "-" as the streak for a season with no games played, and an empty string
// on some stub rows. Neither is a streak; both would otherwise render as a stray dash in
// the hero (a shipped bug on both surfaces before this).
export function displayStreak(streak: string | null | undefined): string | undefined {
  if (!streak) return undefined;
  const trimmed = streak.trim();
  return trimmed === '' || trimmed === '-' ? undefined : trimmed;
}
