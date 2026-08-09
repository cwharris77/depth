-- nflverse team-season stat line (DEP-137, docs/nflverse.md). Every scalar column
-- from the stats_team_reg_<season>.csv asset, plus the seven distance-list fields
-- parsed from semicolon-delimited text into int[]. One row per (team, season),
-- regular season only (season_type = REG). Sourced exclusively from nflverse,
-- separate from ESPN-sourced team_stats. All stat columns nullable -- a column
-- absent from a given season's CSV stays null rather than zero.
create table team_season_stats (
  team_id text not null references teams(id) on delete cascade,
  season int not null,
  season_type text not null default 'REG',
  games int,

  -- Passing
  completions int,
  attempts int,
  passing_yards int,
  passing_tds int,
  passing_interceptions int,
  sacks_suffered int,
  sack_yards_lost int,
  sack_fumbles int,
  sack_fumbles_lost int,
  passing_air_yards int,
  passing_yards_after_catch int,
  passing_first_downs int,
  passing_epa numeric,
  passing_cpoe numeric,
  passing_2pt_conversions int,
  passing_10 int,
  passing_16 int,
  passing_20 int,
  passing_40 int,

  -- Rushing
  carries int,
  rushing_yards int,
  rushing_tds int,
  rushing_fumbles int,
  rushing_fumbles_lost int,
  rushing_first_downs int,
  rushing_epa numeric,
  rushing_2pt_conversions int,
  rushing_10 int,
  rushing_12 int,
  rushing_20 int,
  rushing_40 int,

  -- Receiving
  receptions int,
  targets int,
  receiving_yards int,
  receiving_tds int,
  receiving_fumbles int,
  receiving_fumbles_lost int,
  receiving_air_yards int,
  receiving_yards_after_catch int,
  receiving_first_downs int,
  receiving_epa numeric,
  receiving_2pt_conversions int,
  receiving_10 int,
  receiving_16 int,
  receiving_20 int,
  receiving_40 int,

  -- Special teams
  special_teams_tds int,

  -- Defense
  def_tackles_solo int,
  def_tackles_with_assist int,
  def_tackle_assists int,
  def_tackles_for_loss int,
  def_tackles_for_loss_yards int,
  def_fumbles_forced int,
  def_sacks numeric,
  def_sack_yards int,
  def_qb_hits int,
  def_interceptions int,
  def_interception_yards int,
  def_pass_defended int,
  def_tds int,
  def_fumbles int,
  def_safeties int,

  -- Misc
  misc_yards int,
  fumble_recovery_own int,
  fumble_recovery_yards_own int,
  fumble_recovery_opp int,
  fumble_recovery_yards_opp int,
  fumble_recovery_tds int,
  penalties int,
  penalty_yards int,
  timeouts int,
  fumbles_forced_by_opp int,
  fumbles_not_forced int,
  fumbles_out_of_bounds int,
  fumbles_total int,
  fumbles_lost_total int,

  -- Returns
  punt_returns int,
  punt_return_yards int,
  kickoff_returns int,
  kickoff_return_yards int,

  -- Kicking (scalars)
  fg_made int,
  fg_att int,
  fg_missed int,
  fg_blocked int,
  fg_long int,
  fg_pct numeric,
  fg_made_0_19 int,
  fg_made_20_29 int,
  fg_made_30_39 int,
  fg_made_40_49 int,
  fg_made_50_ int,
  fg_missed_0_19 int,
  fg_missed_20_29 int,
  fg_missed_30_39 int,
  fg_missed_40_49 int,
  fg_missed_50_ int,

  -- PAT
  pat_made int,
  pat_att int,
  pat_missed int,
  pat_blocked int,
  pat_pct numeric,

  -- Game-winning FG
  gwfg_made int,
  gwfg_att int,
  gwfg_missed int,
  gwfg_blocked int,

  -- Punting
  pt_att int,
  pt_blocked int,
  pt_long int,
  pt_yards int,
  pt_inside_20 int,
  pt_out_of_bounds int,
  pt_downed int,
  pt_touchback int,
  pt_fair_caught int,
  pt_returned int,
  pt_return_yards int,
  pt_return_tds int,
  pt_net_yards int,

  -- Distance lists (semicolon-delimited in CSV, parsed to int[])
  fg_made_list int[],
  fg_missed_list int[],
  fg_blocked_list int[],
  fg_made_distance int[],
  fg_missed_distance int[],
  fg_blocked_distance int[],
  gwfg_distance_list int[],

  updated_at timestamptz not null default now(),

  primary key (team_id, season)
);

-- Same RLS + grant pattern as team_stats and every other base table (AGENTS.md
-- invariant 10, precedent: 20260712160000_add_team_stats.sql). Writes go through
-- the service-role ingest script, which bypasses RLS.
grant select, insert, update, delete on team_season_stats to anon, authenticated, service_role;

alter table team_season_stats enable row level security;
create policy "public read" on team_season_stats for select to anon, authenticated using (true);