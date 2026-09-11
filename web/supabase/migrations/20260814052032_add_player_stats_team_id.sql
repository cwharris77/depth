-- Season-stats team column (DEP-202, vault ticket "Season stats should show which team
-- each season was played for"). Locked scope: surface nflverse's `recent_team` as-is --
-- one team per (player, season, season_type) row, no mid-season-trade split.
--
-- team_id is nullable (a row whose recent_team code doesn't resolve via
-- lib/nflverse/team-codes.ts degrades to null rather than blocking the whole stats row --
-- AGENTS.md invariant 6) and, unlike player_stats.player_id (whose FK to `players` was
-- dropped in 20260813190000 because `players` is current-roster-scoped), it DOES reference
-- teams(id): the teams table always holds all 32 franchises regardless of season, so there's
-- no historic-membership gap here to work around.
alter table player_stats add column team_id text references teams(id) on delete set null;
create index player_stats_team_id_idx on player_stats(team_id);
