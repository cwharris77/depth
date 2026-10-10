-- Events worth telling a fan of one team about: a starter change, a trade, a record
-- chase, a historic single-game line. One row per event; `dedupe_key` is unique so a
-- detector that sees the same event on a later run cannot write it twice.
--
-- `headline`/`detail` are rendered once, at detection, from fixed templates, so every
-- reader shows identical text. `payload` carries the structured facts behind the text.
create table team_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  event_type text not null check (
    event_type in ('starter_change', 'trade', 'record_chase', 'historic_week')
  ),
  tier text not null check (tier in ('big_moments', 'everything')),
  team_id text not null references teams(id) on delete cascade,
  -- No FK: `players` holds only athletes currently on a depth chart, and a traded
  -- player may not be on one.
  player_id text,
  headline text not null,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  source text not null check (
    source in ('espn_depth_chart', 'espn_transactions', 'nflverse_stats')
  ),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index team_events_team_occurred_idx on team_events (team_id, occurred_at desc);

comment on table team_events is
  'Per-team events detected by the ingests. Public read; written only by the service role.';

-- Public data read with the anon key. Revoke first: tables here inherit ALL for the
-- client roles by default, so a bare grant would not narrow anything.
revoke all on team_events from anon, authenticated;
grant select on team_events to anon, authenticated;
grant select, insert, update, delete on team_events to service_role;

alter table team_events enable row level security;
create policy "public read" on team_events for select to anon, authenticated using (true);

-- The confirmed starter at each position, plus at most one candidate seen on the latest
-- run. A new starter is confirmed, and an event written, only when the same candidate
-- is seen on two consecutive runs, so a one-run blip in the source never becomes an
-- event. Names are stored so an event can name the outgoing player after he has left
-- the roster. `candidate_seen_at` is when the candidate first appeared; it dates the
-- event's dedupe key, so re-detecting one change on a later day cannot write it twice.
create table team_starter_state (
  team_id text not null references teams(id) on delete cascade,
  position text not null,
  confirmed_player_id text not null,
  confirmed_player_name text not null,
  candidate_player_id text,
  candidate_player_name text,
  candidate_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (team_id, position)
);

comment on table team_starter_state is
  'Detector working state. Read and written only by the service role.';

-- Working state for the ingest only. No client reads it, so there is no client policy;
-- the service role bypasses RLS.
revoke all on team_starter_state from anon, authenticated;
grant select, insert, update, delete on team_starter_state to service_role;

alter table team_starter_state enable row level security;
