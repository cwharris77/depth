-- Weekly-grain nflverse source tables are bounded to a recent window: nothing serves
-- weekly history (the canonical layer is season-grain), and nflverse_player_week
-- alone was ~314 MB at full depth -- most of a 500 MB free-tier database cap. The
-- season-grain source (nflverse_player_season) keeps full history.
--
-- Keep the most recent 4 seasons. The cutoff is computed from nflverse_player_season's own
-- max rather than a hard-coded year, so it can't drift; the ingest now enforces the same
-- window on every run (NFLVERSE_WEEKLY_RETENTION_SEASONS, default 4), so this cleans up
-- once. Reclaim the freed pages with autovacuum (or `vacuum full` if you want it back now).
delete from nflverse_player_week
where season < (select max(season) - 3 from nflverse_player_season);

delete from pfr_player_week
where season < (select max(season) - 3 from nflverse_player_season);

delete from ngs_player_week
where season < (select max(season) - 3 from nflverse_player_season);
