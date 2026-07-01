create table teams (
  id text primary key,
  espn_id text,
  abbrev text not null,
  city text not null,
  name text not null,
  conference text not null,
  division text not null,
  color_primary text,
  color_secondary text,
  color_accent text,
  ui_accent text,
  on_accent text,
  logo_url text,
  logo_dark_url text,
  updated_at timestamptz not null default now()
);

create table players (
  id text primary key,
  team_id text not null references teams(id) on delete cascade,
  name text not null,
  number int,
  position text not null,
  status text,
  age int,
  college text,
  experience int,
  height text,
  weight int,
  bio text,
  photo_url text,
  updated_at timestamptz not null default now()
);
create index players_team_id_idx on players(team_id);

create table depth_chart_entries (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references teams(id) on delete cascade,
  position text not null,
  depth_rank smallint not null check (depth_rank between 1 and 3),
  player_id text not null references players(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (team_id, position, depth_rank)
);

create table special_teams_slots (
  id text primary key,
  team_id text not null references teams(id) on delete cascade,
  label text not null,
  player_id text references players(id) on delete set null,
  x numeric,
  y numeric,
  updated_at timestamptz not null default now()
);

create table ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'espn',
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null check (status in ('success', 'partial', 'failure')),
  teams_written int default 0,
  errors jsonb,
  created_at timestamptz not null default now()
);

create table roster_overlays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references teams(id) on delete cascade,
  player_id text not null references players(id) on delete cascade,
  depth_rank smallint not null check (depth_rank between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, team_id, player_id)
);
create index roster_overlays_user_id_idx on roster_overlays(user_id);
