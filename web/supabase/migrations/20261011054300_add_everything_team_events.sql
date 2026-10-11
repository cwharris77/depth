-- Expand the public event vocabulary without changing existing reader contracts.
alter table public.team_events drop constraint team_events_event_type_check;
alter table public.team_events add constraint team_events_event_type_check check (
  event_type in ('starter_change','trade','record_chase','historic_week',
    'depth_change','signing','cut','injury_change','good_week')
);
alter table public.team_events drop constraint team_events_source_check;
alter table public.team_events add constraint team_events_source_check check (
  source in ('espn_depth_chart','espn_transactions','nflverse_stats','espn_injuries')
);

create table public.team_event_snapshot_state (
  team_id text primary key references public.teams(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  observed_at timestamptz not null,
  state jsonb not null check (jsonb_typeof(state) = 'object')
);
alter table public.team_event_snapshot_state enable row level security;
revoke all on public.team_event_snapshot_state from public, anon, authenticated;
grant select, insert, update, delete on public.team_event_snapshot_state to service_role;

-- Revision and source time protect against concurrent workers and repeated sightings.
-- All inserts share the transaction, so a failed event cannot advance a baseline.
create function public.commit_team_event_snapshot(
  p_team_id text, p_expected_revision bigint, p_observed_at timestamptz,
  p_state jsonb, p_events jsonb, p_starter_state jsonb
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  prior public.team_event_snapshot_state%rowtype;
begin
  if p_team_id is null or p_expected_revision is null or p_expected_revision < 0
    or p_observed_at is null or not isfinite(p_observed_at)
    or p_state is null or jsonb_typeof(p_state) <> 'object'
    or p_events is null or jsonb_typeof(p_events) <> 'array'
    or p_starter_state is null or jsonb_typeof(p_starter_state) <> 'array' then
    raise exception 'invalid snapshot arguments' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_team_id, 0));
  select * into prior from public.team_event_snapshot_state where team_id = p_team_id;
  if coalesce(prior.revision, 0) <> p_expected_revision then return false; end if;
  if prior.observed_at is not null and p_observed_at <= prior.observed_at then return false; end if;
  if exists (select 1 from jsonb_to_recordset(p_events) as x(team_id text)
    where x.team_id is distinct from p_team_id)
    or exists (select 1 from jsonb_to_recordset(p_starter_state) as x(team_id text)
    where x.team_id is distinct from p_team_id) then
    raise exception 'team mismatch' using errcode = '22023';
  end if;

  insert into public.team_events
    (dedupe_key,event_type,tier,team_id,player_id,headline,detail,payload,source,occurred_at)
  select dedupe_key,event_type,tier,team_id,player_id,headline,detail,payload,source,occurred_at
  from jsonb_to_recordset(p_events) as x(dedupe_key text,event_type text,tier text,
    team_id text,player_id text,headline text,detail text,payload jsonb,source text,
    occurred_at timestamptz)
  on conflict (dedupe_key) do nothing;

  insert into public.team_starter_state
    (team_id,position,confirmed_player_id,confirmed_player_name,
      candidate_player_id,candidate_player_name,candidate_seen_at,updated_at)
  select team_id,position,confirmed_player_id,confirmed_player_name,
    candidate_player_id,candidate_player_name,candidate_seen_at,updated_at
  from jsonb_to_recordset(p_starter_state) as x(team_id text,position text,
    confirmed_player_id text,confirmed_player_name text,candidate_player_id text,
    candidate_player_name text,candidate_seen_at timestamptz,updated_at timestamptz)
  on conflict (team_id,position) do update set
    confirmed_player_id=excluded.confirmed_player_id,
    confirmed_player_name=excluded.confirmed_player_name,
    candidate_player_id=excluded.candidate_player_id,
    candidate_player_name=excluded.candidate_player_name,
    candidate_seen_at=excluded.candidate_seen_at,updated_at=excluded.updated_at;

  insert into public.team_event_snapshot_state(team_id,revision,observed_at,state)
    values (p_team_id,p_expected_revision+1,p_observed_at,p_state)
  on conflict (team_id) do update set revision=excluded.revision,
    observed_at=excluded.observed_at,state=excluded.state;
  return true;
end;
$$;
revoke all on function public.commit_team_event_snapshot(text,bigint,timestamptz,jsonb,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.commit_team_event_snapshot(text,bigint,timestamptz,jsonb,jsonb,jsonb)
  to service_role;
-- IOS-COMPATIBILITY:
-- Safe after App Store build 764 is LIVE.
-- Gate minimum: 764.
-- Old behavior preserved until then: yes. Every existing event type and source remains allowed; existing columns and client grants are unchanged.
-- Rollback: stop the new writers and retain the widened checks and stored events; removing accepted values would reject existing rows.

