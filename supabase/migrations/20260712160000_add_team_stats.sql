-- Team stats page (Phase E, docs/superpowers/specs/2026-07-12-team-stats-page-design.md).
-- Season record + standings detail, one row per team. Sourced from the same ESPN
-- standings fetch already used for conference/division (lib/espn/standings.ts
-- parseTeamStats) -- no new fetch, just more of the payload read. All nullable: a team
-- missing from the standings response this run keeps whatever row it had --
-- writeTeamStats skips the upsert entirely (scripts/ingest-espn.mts) -- never a
-- partially-filled row.
create table team_stats (
  team_id text primary key references teams(id) on delete cascade,
  overall_wins int,
  overall_losses int,
  overall_ties int,
  win_percent numeric,
  home_wins int,
  home_losses int,
  road_wins int,
  road_losses int,
  division_wins int,
  division_losses int,
  conference_wins int,
  conference_losses int,
  points_for int,
  points_against int,
  point_differential int,
  streak text,
  playoff_seed int,
  updated_at timestamptz not null default now()
);

-- Match the explicit-grant pattern (20260701171029_grant_default_table_privileges.sql)
-- and the RLS-with-policy-in-the-same-migration pattern (20260710140000_base_table_rls
-- -- AGENTS.md invariant 10): dbRosterSource reads this table with the anon key, so it
-- ships both the grant and a read policy from the start, never a window where reads break.
grant select, insert, update, delete on team_stats to anon, authenticated, service_role;

alter table team_stats enable row level security;
create policy "public read" on team_stats for select to anon, authenticated using (true);
