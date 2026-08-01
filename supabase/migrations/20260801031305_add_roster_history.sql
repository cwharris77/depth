-- Historical rosters (Phase D1, docs/superpowers/specs/2026-07-07-phase-d-history-and-
-- boards-design.md). One row per (season, team, player) from nflverse's roster_<season>.csv,
-- 1999-present -- no FK to `players` since most historical players never got an ESPN-backed
-- row here (that table is keyed by ESPN athlete id; this one is keyed by nflverse's gsis_id).
-- `depth_rank` is computed at ingest from that season's usage stats (scripts/ingest-nflverse-
-- rosters.mts + lib/nflverse/depth-heuristic.ts) since historical rosters carry no real depth
-- order; capped at 1..3 for the field's per-position slots, while `player_order` keeps the
-- full-precision rank so a future "show the whole roster" view isn't blocked by the cap.
create table roster_history (
  season smallint not null,
  team_id text not null references teams(id) on delete cascade,
  gsis_id text not null,
  espn_id text,
  name text not null,
  number int,
  position text not null,
  college text,
  height text,
  weight int,
  headshot_url text,
  depth_rank smallint not null check (depth_rank between 1 and 3),
  player_order smallint not null,
  updated_at timestamptz not null default now(),
  primary key (season, team_id, gsis_id)
);
create index roster_history_team_season_idx on roster_history(team_id, season);
-- pg_trgm is already enabled (20260702194531_add_players_name_search_index.sql); reused here
-- for the same substring-search need the D2 boards spec's all-time player search relies on.
create index roster_history_name_trgm_idx on roster_history using gin (name gin_trgm_ops);

-- Same explicit-grant + RLS-with-policy-in-the-same-migration pattern as player_stats
-- (20260717081108_add_player_stats.sql, AGENTS.md invariant 10).
grant select, insert, update, delete on roster_history to anon, authenticated, service_role;

alter table roster_history enable row level security;
create policy "public read" on roster_history for select to anon, authenticated using (true);
