-- Real per-team formations (Phase E, docs/superpowers/specs/2026-07-07-phase-e-real-
-- formations-design.md). One row per team's top-3 most-used (qbAlignment,
-- personnelCode) combos for the latest ingested season -- e.g. rank 1 = "SEA: Shotgun
-- 11 personnel, 61% of snaps". `personnel` is the standard NFL shorthand
-- `{RB count}{TE count}` (lib/nflverse/personnel.ts); `pct` is an integer share of the
-- team's charted plays that season. A team/season the ingest judged as insufficient
-- coverage (lib/nflverse/participation.ts) simply has no rows here -- the field view
-- falls back to the generic formation, never a partial/sparse one.
create table team_formations (
  team_id text not null references teams(id) on delete cascade,
  season smallint not null,
  rank smallint not null check (rank between 1 and 3),
  alignment text not null,
  personnel text not null,
  pct smallint not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, season, rank)
);

-- Same explicit-grant + RLS-with-policy-in-the-same-migration pattern as player_stats
-- (20260717081108_add_player_stats.sql, AGENTS.md invariant 10): getTeamFormations
-- reads this table with the anon key from the start, never a window where reads break.
grant select, insert, update, delete on team_formations to anon, authenticated, service_role;

alter table team_formations enable row level security;
create policy "public read" on team_formations for select to anon, authenticated using (true);
