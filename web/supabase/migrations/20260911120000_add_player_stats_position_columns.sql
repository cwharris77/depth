-- Every position group gets a meaningful stat line, not just skill positions
-- (DEP-538). Two nflverse datasets feed one row:
--
--   1. `stats_player_reg_<season>.csv` (already ingested): the full defensive box score
--      (assists / tackles for loss / QB hits / passes defended / forced fumbles /
--      recoveries / defensive TDs / safeties), return counts and yards, special-teams
--      TDs, penalties, and PAT + longest-field-goal columns. All of these were already
--      present in the source frame and were dropped by lib/nflverse/transform.ts.
--   2. `snap_counts_<season>.csv` (already ingested for `player_recent_snaps`): season
--      snap *totals* and share per unit. This is the one real signal for the positions
--      that record no counting stats -- offensive line, long snapper, punter. Stored as
--      season aggregates, never raw game rows (DEP-313 boundary).
--
-- All columns nullable: nflverse writes '' for "not applicable to this position", so a
-- receiver's defensive columns are absent, not zero -- the same rule the original table
-- documents (20260717081108_add_player_stats.sql). `def_sacks` stays numeric for
-- half-sacks; the other defensive counters are integer events.
--
-- Additive only -- an older client's explicit SELECT simply ignores the new columns, so
-- this needs no IOS-COMPATIBILITY annotation.
alter table player_stats
  add column def_tackle_assists int,
  add column def_tackles_for_loss int,
  add column def_qb_hits int,
  add column def_pass_defended int,
  add column def_fumbles_forced int,
  add column def_tds int,
  add column def_safeties int,
  add column fumble_recovery_opp int,
  add column fumble_recovery_tds int,
  add column punt_returns int,
  add column punt_return_yards int,
  add column kickoff_returns int,
  add column kickoff_return_yards int,
  add column special_teams_tds int,
  add column penalties int,
  add column penalty_yards int,
  add column pat_made int,
  add column pat_att int,
  add column fg_long int,
  add column offense_snaps int,
  add column offense_pct double precision,
  add column defense_snaps int,
  add column defense_pct double precision,
  add column special_teams_snaps int,
  add column special_teams_pct double precision;
