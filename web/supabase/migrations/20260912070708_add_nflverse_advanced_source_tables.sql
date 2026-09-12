-- nflverse Layer-1 advanced source tables (DEP-541, full-stat-surface design):
-- pfr_advstats (pfr_player_week), nextgen_stats (ngs_player_week), ESPN QBR
-- (espn_qbr_week/_season), FTN charting (ftn_play). Same separation rule as the box-score
-- tables: typed columns, one writer per source, columns generated from the release
-- headers (lib/nflverse/raw-tables.generated.ts) and regenerated via
-- `npm run gen:nflverse-raw-tables`. Additive only.

create table pfr_player_week (
  source_player_id text not null,
  player_id text,
  season smallint not null,
  season_type text not null default 'REG',
  week smallint not null,
  stat_category text not null,
  updated_at timestamptz not null default now(),
  game_id text,
  pfr_game_id text,
  game_type numeric,
  team text,
  opponent text,
  pfr_player_name numeric,
  passing_drops numeric,
  passing_drop_pct numeric,
  receiving_drop numeric,
  receiving_drop_pct numeric,
  passing_bad_throws numeric,
  passing_bad_throw_pct numeric,
  times_sacked numeric,
  times_blitzed numeric,
  times_hurried numeric,
  times_hit numeric,
  times_pressured numeric,
  times_pressured_pct numeric,
  def_times_blitzed numeric,
  def_times_hurried numeric,
  def_times_hitqb numeric,
  def_ints numeric,
  def_targets numeric,
  def_completions_allowed numeric,
  def_completion_pct numeric,
  def_yards_allowed numeric,
  def_yards_allowed_per_cmp numeric,
  def_yards_allowed_per_tgt numeric,
  def_receiving_td_allowed numeric,
  def_passer_rating_allowed numeric,
  def_adot numeric,
  def_air_yards_completed numeric,
  def_yards_after_catch numeric,
  def_sacks numeric,
  def_pressures numeric,
  def_tackles_combined numeric,
  def_missed_tackles numeric,
  def_missed_tackle_pct numeric,
  carries numeric,
  rushing_yards_before_contact numeric,
  rushing_yards_before_contact_avg numeric,
  rushing_yards_after_contact numeric,
  rushing_yards_after_contact_avg numeric,
  rushing_broken_tackles numeric,
  receiving_broken_tackles numeric,
  receiving_int numeric,
  receiving_rat numeric,
  primary key (source_player_id, season, season_type, week, stat_category)
);
create index pfr_player_week_player_id_idx on pfr_player_week(player_id);
grant select, insert, update, delete on pfr_player_week to anon, authenticated, service_role;
alter table pfr_player_week enable row level security;
create policy "public read" on pfr_player_week for select to anon, authenticated using (true);


create table ngs_player_week (
  source_player_id text not null,
  player_id text,
  season smallint not null,
  season_type text not null default 'REG',
  week smallint not null,
  stat_category text not null,
  updated_at timestamptz not null default now(),
  player_display_name text,
  player_position text,
  team_abbr text,
  avg_time_to_throw numeric,
  avg_completed_air_yards numeric,
  avg_intended_air_yards numeric,
  avg_air_yards_differential numeric,
  aggressiveness numeric,
  max_completed_air_distance text,
  avg_air_yards_to_sticks numeric,
  attempts numeric,
  pass_yards numeric,
  pass_touchdowns numeric,
  interceptions numeric,
  passer_rating numeric,
  completions numeric,
  completion_percentage numeric,
  expected_completion_percentage numeric,
  completion_percentage_above_expectation numeric,
  avg_air_distance text,
  max_air_distance text,
  player_first_name text,
  player_last_name text,
  player_jersey_number numeric,
  player_short_name text,
  efficiency numeric,
  percent_attempts_gte_eight_defenders numeric,
  avg_time_to_los numeric,
  rush_attempts numeric,
  rush_yards numeric,
  expected_rush_yards numeric,
  rush_yards_over_expected numeric,
  avg_rush_yards numeric,
  rush_yards_over_expected_per_att numeric,
  rush_pct_over_expected numeric,
  rush_touchdowns numeric,
  avg_cushion numeric,
  avg_separation numeric,
  percent_share_of_intended_air_yards numeric,
  receptions numeric,
  targets numeric,
  catch_percentage numeric,
  yards numeric,
  rec_touchdowns numeric,
  avg_yac numeric,
  avg_expected_yac numeric,
  avg_yac_above_expectation numeric,
  primary key (source_player_id, season, season_type, week, stat_category)
);
create index ngs_player_week_player_id_idx on ngs_player_week(player_id);
grant select, insert, update, delete on ngs_player_week to anon, authenticated, service_role;
alter table ngs_player_week enable row level security;
create policy "public read" on ngs_player_week for select to anon, authenticated using (true);


create table espn_qbr_week (
  source_player_id text not null,
  player_id text,
  season smallint not null,
  season_type text not null default 'REG',
  week smallint not null,
  updated_at timestamptz not null default now(),
  game_id text,
  game_week numeric,
  week_text text,
  team_abb text,
  name_short text,
  rank numeric,
  qbr_total numeric,
  pts_added numeric,
  qb_plays numeric,
  epa_total numeric,
  pass numeric,
  run numeric,
  exp_sack numeric,
  penalty numeric,
  qbr_raw numeric,
  sack numeric,
  name_first text,
  name_last text,
  name_display text,
  headshot_href text,
  team text,
  opp_id text,
  opp_abb text,
  opp_team text,
  opp_name text,
  week_num numeric,
  qualified boolean,
  primary key (source_player_id, season, season_type, week)
);
create index espn_qbr_week_player_id_idx on espn_qbr_week(player_id);
grant select, insert, update, delete on espn_qbr_week to anon, authenticated, service_role;
alter table espn_qbr_week enable row level security;
create policy "public read" on espn_qbr_week for select to anon, authenticated using (true);


create table espn_qbr_season (
  source_player_id text not null,
  player_id text,
  season smallint not null,
  season_type text not null default 'REG',
  updated_at timestamptz not null default now(),
  game_week numeric,
  team_abb text,
  name_short text,
  rank numeric,
  qbr_total numeric,
  pts_added numeric,
  qb_plays numeric,
  epa_total numeric,
  pass numeric,
  run numeric,
  exp_sack numeric,
  penalty numeric,
  qbr_raw numeric,
  sack numeric,
  name_first text,
  name_last text,
  name_display text,
  headshot_href text,
  team text,
  qualified boolean,
  primary key (source_player_id, season, season_type)
);
create index espn_qbr_season_player_id_idx on espn_qbr_season(player_id);
grant select, insert, update, delete on espn_qbr_season to anon, authenticated, service_role;
alter table espn_qbr_season enable row level security;
create policy "public read" on espn_qbr_season for select to anon, authenticated using (true);


create table ftn_play (
  updated_at timestamptz not null default now(),
  ftn_game_id text,
  nflverse_game_id text,
  season numeric,
  week numeric,
  ftn_play_id numeric,
  nflverse_play_id text,
  starting_hash text,
  qb_location text,
  n_offense_backfield numeric,
  n_defense_box numeric,
  is_no_huddle boolean,
  is_motion boolean,
  is_play_action boolean,
  is_screen_pass boolean,
  is_rpo boolean,
  is_trick_play boolean,
  is_qb_out_of_pocket boolean,
  is_interception_worthy boolean,
  is_throw_away boolean,
  read_thrown boolean,
  is_catchable_ball boolean,
  is_contested_ball boolean,
  is_created_reception boolean,
  is_drop boolean,
  is_qb_sneak boolean,
  n_blitzers numeric,
  n_pass_rushers numeric,
  is_qb_fault_sack boolean,
  date_pulled text,
  primary key (ftn_game_id, ftn_play_id)
);
grant select, insert, update, delete on ftn_play to anon, authenticated, service_role;
alter table ftn_play enable row level security;
create policy "public read" on ftn_play for select to anon, authenticated using (true);
