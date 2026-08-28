// THE canonical definition of "which NFL season is current/upcoming/completed".
//
// Everything answers this through one calendar function, never by deriving it from
// a data source's own label:
//   - web read side (via the Next-cached wrapper in ./nfl-season.ts)
//   - iOS read side (the Swift twin, TeamStatsMapper.nflSeasonState)
//   - every ingest script (scripts/ingest-espn.mts, and future sources)
//
// Why the calendar and not a source's label (2026-08-28, DEP-394): ESPN's
// `standings.season` label is what *lied* during the 2025→2026 rollover — it
// vanished for a week (ingest wrote nothing, still reported success) and
// mislabeled the 2025 standings placeholder, which got written as a playoff seed
// 0 and rendered "MISSED PLAYOFFS" for the Super Bowl champion Seahawks. The
// calendar never disagrees with reality (the 2025 season really did end in Feb
// 2026); what a source thinks about its own data availability is a separate,
// per-source concern guarded at ingest (ESPN skips `playoff_seed <= 0`; nflverse
// is REG-only). A source may *probe* its own data availability, but never relabel
// a season.
//
// NFL season timing: the regular season starts the Thursday after Labor Day (early
// September) and runs through early February (Super Bowl); the off-season runs
// early February to early September. Season-year labeling follows NFL convention:
// the 2025 season (Sep 2025 – Feb 2026) is called the 2025 season.

export interface SeasonState {
  /** The most recent season whose Super Bowl has been played. */
  completedSeason: number;
  /** The next season to kick off (this calendar year during the off-season). */
  upcomingSeason: number;
  /** Feb–Aug, between the Super Bowl and the next regular season. */
  isOffseason: boolean;
}

/**
 * The season that is live or the next one about to start — the "trim the future
 * placeholder" baseline both the read side and the ingest fetch set derive from.
 * During the off-season the current season is the upcoming season (this calendar
 * year); in-season it's the season being played right now.
 */
export function currentSeasonOf(
  state: Pick<SeasonState, 'isOffseason' | 'upcomingSeason'>
): number {
  return state.isOffseason ? state.upcomingSeason : state.upcomingSeason - 1;
}

/**
 * The season year that has been completed (the most recent season whose Super
 * Bowl has been played), the upcoming season, and whether we're in the off-season.
 * A rough heuristic on the real NFL calendar:
 * - Jan: still wrapping up the previous year's postseason (season = year - 1)
 * - Feb–Aug: off-season, upcoming season = this calendar year
 * - Sep–Dec: regular season, current season = this calendar year
 */
export function nflSeasonState(now: Date = new Date()): SeasonState {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec

  if (month >= 8) {
    // Sep–Dec: we're in the regular season of `year`
    return { completedSeason: year - 1, upcomingSeason: year + 1, isOffseason: false };
  } else if (month >= 1) {
    // Feb–Aug: off-season, upcoming season = this calendar year
    return { completedSeason: year - 1, upcomingSeason: year, isOffseason: true };
  } else {
    // Jan: still wrapping up the previous year's postseason
    return { completedSeason: year - 1, upcomingSeason: year, isOffseason: false };
  }
}
