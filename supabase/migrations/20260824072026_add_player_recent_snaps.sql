create table player_recent_snaps (
  team_id text not null references teams(id) on delete cascade,
  season int not null check (season >= 2012),
  player_id text not null,
  window_start_week int not null check (window_start_week between 1 and 22),
  window_end_week int not null check (window_end_week between window_start_week and 22),
  window_game_ids text[] not null check (cardinality(window_game_ids) between 1 and 3),
  games int not null check (games between 1 and 3 and games = cardinality(window_game_ids)),
  offense_snaps int not null check (offense_snaps >= 0),
  offense_pct double precision check (offense_pct between 0 and 1),
  defense_snaps int not null check (defense_snaps >= 0),
  defense_pct double precision check (defense_pct between 0 and 1),
  special_teams_snaps int not null check (special_teams_snaps >= 0),
  special_teams_pct double precision check (special_teams_pct between 0 and 1),
  source text not null check (source = 'nflverse-pfr'),
  updated_at timestamptz not null default now(),
  primary key (team_id, season, player_id)
);

revoke all on player_recent_snaps from anon, authenticated, service_role;
grant select on player_recent_snaps to anon, authenticated;
grant select, insert, update, delete on player_recent_snaps to service_role;

alter table player_recent_snaps enable row level security;
create policy "public read" on player_recent_snaps
  for select to anon, authenticated using (true);
