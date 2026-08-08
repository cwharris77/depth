-- nflverse team season stats (team-level passing, rushing, receiving scalars).
-- One row per (team_id, season), sourced from nflverse's stats_team_reg_<season>.csv
-- (scripts/ingest-nflverse.mts), NOT from ESPN -- cross-provenance invariant
-- (docs/superpowers/specs/2026-07-17-team-schedule-design.md:51-52): ESPN-owned
-- team_stats and nflverse-owned team_season_stats stay separate tables.
-- All stat columns nullable: the display set is a subset of nflverse's full ~131-column
-- frame. Distance-list columns (e.g. passing_yards_per_attempt, receiving_yards_per_game)
-- are left nullable for DEP-149's full stat-line capture; this migration carries the
-- passing/rushing/receiving scalar line that DEP-136's rank/read path needs.
create table team_season_stats (
  team_id text not null references teams(id) on delete cascade,
  season smallint not null,
  games smallint,
  completions int,
  attempts int,
  passing_yards int,
  passing_tds int,
  passing_interceptions int,
  carries int,
  rushing_yards int,
  rushing_tds int,
  receptions int,
  targets int,
  receiving_yards int,
  receiving_tds int,
  updated_at timestamptz not null default now(),
  primary key (team_id, season)
);

-- Same explicit-grant + RLS-with-policy-in-the-same-migration pattern as team_stats
-- and player_stats (AGENTS.md invariant 10): the rank query in fetchTeamStatsPage
-- reads this table with the anon key, so it ships both the grant and a read policy
-- from the start, never a window where reads break.
grant select, insert, update, delete on team_season_stats to anon, authenticated, service_role;

alter table team_season_stats enable row level security;
create policy "public read" on team_season_stats for select to anon, authenticated using (true);