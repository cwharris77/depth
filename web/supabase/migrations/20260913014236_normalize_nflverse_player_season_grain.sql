-- DEP-558: nflverse_player_season's source (stats_player_regpost_<season>.csv) holds exactly
-- one row per player-season, and its season_type is a *coverage flag*, not a grain:
--   REG       the team did not play in the postseason; the row is the regular-season total
--   REG+POST  the player played in the postseason; the row is regular + postseason combined
--   POST      postseason-only (no regular-season appearance)
-- No player-season carries both REG and REG+POST. The raw transform landed the source value
-- verbatim, so any reader that filtered season_type = 'REG' — the natural assumption, and
-- what the legacy player_stats table uses — silently dropped every playoff participant
-- (~30% of a season) plus the POST-only players.
--
-- The table's declared grain is REG+POST (2026-09-11-nflverse-full-stat-surface-design,
-- Decisions table), so relabel every row to it. This cannot collide: a player-season with
-- both a REG and a REG+POST row would violate the primary key below and fail the migration
-- loudly rather than silently collapsing two different totals.
update nflverse_player_season
set season_type = 'REG+POST'
where season_type <> 'REG+POST';

-- Keep the column default in step with the generator's DDL (scripts/gen-nflverse-raw-tables.mts)
-- so a future direct insert can't reintroduce the mixed grain.
alter table nflverse_player_season
  alter column season_type set default 'REG+POST';
