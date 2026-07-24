import { cacheLife } from 'next/cache';

// NFL season timing. The regular season starts the Thursday after Labor Day (early
// September) and runs through early February (Super Bowl). The off-season runs from
// early February through early September.
//
// Season-year labeling follows NFL convention: the 2025 season (Sep 2025 – Feb 2026)
// is called the 2025 season. During the off-season (Feb–Aug), the *upcoming* season is
// the current calendar year (e.g. the season starting Sep 2026 is the 2026 season).

/**
 * The NFL regular season typically starts the first week of September. Before that,
 * games are pre-season; after the Super Bowl (early Feb), it's the off-season.
 *
 * Returns the season year that has been completed (the most recent season whose Super
 * Bowl has been played), and whether we're currently in the off-season.
 */
export function nflSeasonState(): {
  completedSeason: number;
  upcomingSeason: number;
  isOffseason: boolean;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec

  // The NFL season runs Sep–Feb. As a rough heuristic:
  // - Jan–Feb: still in the completed season's postseason (season = year - 1)
  // - Mar–Aug: off-season, upcoming season = year
  // - Sep–Dec: regular season, current season = year
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

// Cache Components wrapper (next.config.ts): `new Date()` can't be read directly in a
// prerendered scope — Next requires either request-time data (cookies/headers/
// searchParams/connection()) or a `'use cache'` boundary first. The season/offseason
// boundary only flips twice a year, so a cache is the right tool here, not a dynamic
// hole: 'hours' comfortably re-evaluates well within a day of the actual Sep/Feb
// transition, which is the only time a stale read would ever be visibly wrong.
export async function getNflSeasonState(): Promise<ReturnType<typeof nflSeasonState>> {
  'use cache';
  cacheLife('hours');
  return nflSeasonState();
}
