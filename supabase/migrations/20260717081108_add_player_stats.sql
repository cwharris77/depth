-- nflverse ingestion scaffolding + player season stats (Phase D/E foundation,
-- docs/superpowers/specs/2026-07-07-nflverse-ingestion-and-player-stats-design.md).
-- One row per (player, season, season_type); v1 only ever writes season_type='REG'
-- (scripts/ingest-nflverse.mts fetches stats_player_reg_<season>.csv), but the column
-- is generalized now so a later POST/weekly enrichment doesn't need a schema change.
-- All stat columns nullable + int: the display set is a subset of nflverse's ~110
-- column frame, and not every column applies to every position (a WR row's passing_*
-- columns are null, not zero -- see lib/nflverse/transform.ts). def_sacks is numeric,
-- not int -- half-sacks are real (two players sharing a sack).
create table player_stats (
  player_id text not null references players(id) on delete cascade,
  season smallint not null,
  season_type text not null default 'REG' check (season_type in ('REG', 'POST')),
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
  def_tackles_solo int,
  def_sacks numeric,
  def_interceptions int,
  fg_made int,
  fg_att int,
  updated_at timestamptz not null default now(),
  primary key (player_id, season, season_type)
);
create index player_stats_player_id_idx on player_stats(player_id);

-- Same explicit-grant + RLS-with-policy-in-the-same-migration pattern as team_stats
-- (20260712160000_add_team_stats.sql, AGENTS.md invariant 10): getPlayerStats reads
-- this table with the anon key from the start, never a window where reads break.
grant select, insert, update, delete on player_stats to anon, authenticated, service_role;

alter table player_stats enable row level security;
create policy "public read" on player_stats for select to anon, authenticated using (true);
