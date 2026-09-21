-- Team-level offensive-line metrics derived from nflverse play-by-play (DEP-XXX, the
-- vault's 2026-09-11-nflverse-full-stat-surface-design, Part 2). Offensive-line play has
-- no free per-player source, so these are *unit* metrics: Adjusted Line Yards, stuffed
-- rate, power success, 2nd-level/open-field yards, and pass protection (sack rate,
-- pressure rate allowed, time to throw, pass rushers faced). The pressure columns derive
-- from nflverse pbp's FTN-charted was_pressure/time_to_throw/number_of_pass_rushers, so
-- wherever they surface the UI must attribute them to nflverse / FTN charting.
--
-- One row per (team, season), regular season only. Every metric is nullable: a family
-- with no sample stays null rather than zero, and a team below the games-with-data
-- coverage bar gets no row at all (never a partial metric). Writes go through the
-- service-role ingest, which bypasses RLS.
create table team_line_stats (
  team_id text not null references teams(id) on delete cascade,
  season int not null,

  -- Run game (Football Outsiders definitions)
  rushes int,
  line_yards numeric,
  adjusted_line_yards numeric,
  stuffed_rate numeric,
  power_success_rate numeric,
  second_level_yards numeric,
  second_level_yards_per_rush numeric,
  open_field_yards numeric,
  open_field_yards_per_rush numeric,

  -- Pass protection (pressure columns are FTN-charted via nflverse pbp)
  dropbacks int,
  sacks_allowed int,
  sack_rate numeric,
  pressures_allowed int,
  pressure_rate numeric,
  avg_time_to_throw numeric,
  avg_pass_rushers numeric,

  updated_at timestamptz not null default now(),

  primary key (team_id, season)
);

-- Same RLS + grant pattern as team_season_stats and every other base table
-- (AGENTS.md invariant 10, precedent: 20260808000000_add_team_season_stats.sql).
grant select, insert, update, delete on team_line_stats to anon, authenticated, service_role;

alter table team_line_stats enable row level security;
create policy "public read" on team_line_stats for select to anon, authenticated using (true);
