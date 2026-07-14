-- Season-scoped head coach (docs/superpowers/specs/2026-07-14-season-scoped-head-coach-
-- design.md). teams.coach_name/coach_experience (20260712150000_add_team_coach.sql) is
-- ESPN-sourced and reflects only the *current* coach -- verified live (2026-07-14
-- multi-season-team-stats-design.md) that ESPN's roster endpoint does not vary `coach`
-- by the `season` query param, so it cannot back a season switcher. This table holds
-- the hand-curated per-season coach instead: one row per (team, season) the app has ever
-- shown, append-only per invariant 9. `source` distinguishes curated rows from any future
-- writer the same way `uniforms.source` does, even though 'curated' is the only writer
-- today.
create table team_coach_seasons (
  team_id text not null references teams(id) on delete cascade,
  season int not null,
  coach_name text not null,
  coach_experience int not null,
  source text not null default 'curated',
  updated_at timestamptz not null default now(),
  primary key (team_id, season)
);

-- Same explicit-grant + RLS-with-policy-in-the-same-migration pattern as team_stats
-- (20260712160000_add_team_stats.sql, AGENTS.md invariant 10) -- dbRosterSource reads
-- this with the anon key from the start.
grant select, insert, update, delete on team_coach_seasons to anon, authenticated, service_role;

alter table team_coach_seasons enable row level security;
create policy "public read" on team_coach_seasons for select to anon, authenticated using (true);
