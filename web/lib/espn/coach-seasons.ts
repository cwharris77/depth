// Derives the current season's `team_coach_seasons` row from ESPN's live head coach
// plus the team's own prior-season row (DEP-597).
//
// Why this can't read ESPN's number: `teams.coach_experience` is ESPN's **career**
// head-coaching seasons (prod has Mike McCarthy at 18 in his first year with the
// Steelers -- 13 GB + 5 DAL), while `team_coach_seasons.coach_experience` means
// **seasons with this team, counting the given season** (20260714140000's header). A
// brand-new HC is 0 in both units, which is the only reason the mismatch went
// unnoticed. So team-scoped experience is derived from this table's own history
// instead, which makes the table self-sustaining: each season's row is computed from
// the one before it.
//
// Mid-season coaching changes take the live value (DEP-597, decided 2026-09-18): the
// current season's row always reflects whoever ESPN lists today, so a week-6 firing
// moves the row to the interim immediately. The curated 2023-25 rows instead credit
// whoever coached the *majority* of that season's games, a judgment an ingest run can't
// evaluate; settling completed seasons to that rule is a tracked follow-up.

/** The fields of a `team_coach_seasons` row this derivation needs. */
export interface CoachSeasonRow {
  season: number;
  coach_name: string;
  coach_experience: number;
}

/**
 * Seasons the named coach will have led this team *including* the season being
 * written, given the team's most recent row from a season before it.
 *
 * Same coach as last season -> one more; anyone else (new hire, in-season interim) ->
 * their 1st. Deliberately keyed off a strictly-earlier season so re-running the ingest
 * on the same day is idempotent rather than incrementing on every run.
 */
export function coachSeasonExperience(coachName: string, prior: CoachSeasonRow): number {
  return prior.coach_name === coachName ? prior.coach_experience + 1 : 1;
}

/**
 * The team's most recent row strictly before `season`, or null when the table has no
 * history for it. Callers treat null as "can't derive" rather than assuming a 1st
 * season -- a continuing coach with a missing history would otherwise be silently
 * demoted to his 1st year.
 */
export function priorCoachSeason(rows: CoachSeasonRow[], season: number): CoachSeasonRow | null {
  return rows.filter((row) => row.season < season).sort((a, b) => b.season - a.season)[0] ?? null;
}
