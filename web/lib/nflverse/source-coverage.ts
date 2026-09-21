// Known published season ranges per nflverse source, and the decision a 404 should
// produce (DEP-579): a *skip* when the source genuinely doesn't publish that season, an
// *error* when it should have. Without this, every 404 in the ingest was treated as
// "source doesn't publish that season" — so a renamed release asset (`player_stats` ->
// `stats_player`) logged a skip and the run still reported success. See the vault's
// `Reference/nflverse.md` for the tag rename and `source-contract.ts` for the column
// half of the same guard.

import type { SourceId } from './source-contract';

export interface SourceCoverage {
  minSeason: number;
  /** Last season the source publishes, for a source that stopped. */
  maxSeason?: number;
  /**
   * One file holds every season (QBR), so its presence doesn't depend on the season the
   * ingest happens to be running: a 404 is always an error, never an out-of-range skip.
   */
  wholeHistory?: boolean;
}

// Sole source of truth for each source's published range, keyed by the ingest's source
// id (source-contract.ts) so a 404 decision can name the source directly.
export const SOURCE_COVERAGE: Record<SourceId, SourceCoverage> = {
  players: { minSeason: 1999 },
  games: { minSeason: 1999 },
  stats_player_reg: { minSeason: 1999 },
  stats_team: { minSeason: 1999 },
  stats_player_regpost: { minSeason: 1999 },
  stats_player_week: { minSeason: 1999 },
  pfr_advstats: { minSeason: 2018 },
  nextgen_stats: { minSeason: 2016, maxSeason: 2024 },
  ftn_charting: { minSeason: 2022 },
  // QBR is a whole-history file per grain (`qbr_week_level.csv` / `qbr_season_level.csv`).
  espn_qbr_week: { minSeason: 2006, wholeHistory: true },
  espn_qbr_season: { minSeason: 2006, wholeHistory: true },
  snap_counts: { minSeason: 2012 },
  pbp_participation: { minSeason: 2016 },
  // Full play-by-play (play_by_play_<season>.csv), the offensive-line fold's source.
  // The file publishes back to 1999; the FTN-charted pressure columns inside it only
  // start in 2022, and line-metrics degrades those to null outside that era.
  pbp: { minSeason: 1999 },
};

export type MissingAssetClass = 'skip' | 'error';

/**
 * Whether `source` publishes `season` at all (inside its floor/ceiling). Says nothing about
 * the in-progress season, which may or may not have a file yet: a caller decides whether to
 * fetch with this, and classifies a 404 with `classifyMissingAsset`.
 */
export function isPublishedSeason(source: SourceId, season: number): boolean {
  const coverage = SOURCE_COVERAGE[source];
  if (coverage.wholeHistory) return true;
  if (season < coverage.minSeason) return false;
  return coverage.maxSeason === undefined || season <= coverage.maxSeason;
}

/**
 * Classify a 404 for `source`'s `season`: `skip` outside the published range and for an
 * in-progress season (its file isn't published until the first data exists), `error`
 * inside it. `latestCompletedSeason` is the canonical calendar value
 * (lib/utils/team/season-state.ts `nflSeasonState().completedSeason`) — never a source's
 * own label.
 */
export function classifyMissingAsset(
  source: SourceId,
  season: number,
  latestCompletedSeason: number
): MissingAssetClass {
  const coverage = SOURCE_COVERAGE[source];
  if (coverage.wholeHistory) return 'error';
  if (!isPublishedSeason(source, season)) return 'skip';
  if (season > latestCompletedSeason) return 'skip';
  return 'error';
}
