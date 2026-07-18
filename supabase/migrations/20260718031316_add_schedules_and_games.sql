-- Team schedules + games (docs/superpowers/specs/2026-07-17-team-schedule-design.md).
-- Sourced from nflverse's nfldata/games.csv via scripts/ingest-nflverse.mts, the second
-- data source next to ESPN. Two tables:
--
--   schedules  — the per-(team, season) anchor: one row per team per season it played.
--   games      — one row per actual game (nflverse's game_id). A game is a SHARED entity
--                between two teams (nflverse does not duplicate it per team), so it carries
--                both team ids and links to BOTH teams' schedule rows via two composite FKs.
--
-- schedules stays deliberately lean in v1: the season *record* lives in the ESPN-sourced
-- team_stats table (also keyed (team_id, season)); duplicating it here would create a second
-- source of truth and cross provenance (invariant 9). schedules is the future home for
-- schedule-*derived* aggregates (games played, home/away split, strength of schedule), all
-- computable from `games`.

create table schedules (
  team_id text not null references teams(id) on delete cascade,
  season smallint not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, season)
);

-- One row per game. Scores are nullable: an upcoming/unplayed game has no score yet
-- (nflverse leaves them blank), which is also how the read layer detects "upcoming"
-- (lib/schedule.ts) -- no separate played flag. game_type is stored as nflverse's raw
-- value (REG / WC / DIV / CON / SB today) with NO check constraint, so a future value
-- degrades into the data instead of failing the whole ingest (invariant 6). gameday /
-- gametime are nullable because far-future games can lack a locked date/time. The two
-- composite FKs enforce that both teams have a schedules row for that season, so a game
-- can never orphan -- the ingest upserts schedules before games for exactly this reason.
create table games (
  game_id text primary key,
  season smallint not null,
  game_type text not null,
  week smallint,
  gameday date,
  gametime text,
  home_team_id text not null,
  away_team_id text not null,
  home_score smallint,
  away_score smallint,
  updated_at timestamptz not null default now(),
  foreign key (home_team_id, season) references schedules(team_id, season) on delete cascade,
  foreign key (away_team_id, season) references schedules(team_id, season) on delete cascade
);

-- The per-team-season read (getTeamSchedule) filters games by one team across home and
-- away, so index both composite directions; season alone backs season-scoped scans.
create index games_home_team_season_idx on games(home_team_id, season);
create index games_away_team_season_idx on games(away_team_id, season);
create index games_season_idx on games(season);

-- Same explicit-grant + RLS-with-policy-in-the-same-migration pattern as player_stats
-- (20260717081108_add_player_stats.sql, AGENTS.md invariant 10): dbRosterSource reads
-- both tables with the anon key, so each ships a grant and a public read policy from the
-- start -- never a window where reads return zero rows. Writes go through the service-role
-- ingest, which bypasses RLS.
grant select, insert, update, delete on schedules to anon, authenticated, service_role;
grant select, insert, update, delete on games to anon, authenticated, service_role;

alter table schedules enable row level security;
create policy "public read" on schedules for select to anon, authenticated using (true);

alter table games enable row level security;
create policy "public read" on games for select to anon, authenticated using (true);
