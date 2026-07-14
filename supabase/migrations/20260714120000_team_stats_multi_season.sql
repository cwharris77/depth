-- Multi-season team stats (docs/superpowers/specs/2026-07-14-multi-season-team-stats-design.md).
-- team_stats was 1:1 with teams (current season only); this extends it to one row per
-- (team, season) so the stats page can offer a season switcher. Existing rows came from
-- ESPN's unparameterized standings fetch, verified live on 2026-07-14 to embed
-- `standings.season: 2025` per division -- backfill to that value before locking the
-- column not-null.
alter table team_stats add column season int;
update team_stats set season = 2025 where season is null;
alter table team_stats alter column season set not null;

alter table team_stats drop constraint team_stats_pkey;
alter table team_stats add primary key (team_id, season);
