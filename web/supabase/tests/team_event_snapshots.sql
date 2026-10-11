begin;
-- Test-owned identities and rollback leave the local stack unchanged.
insert into public.teams (id, city, name, abbrev, conference, division) values ('snapshot-fixture', 'Fixture', 'Snapshots', 'SNP', 'NFC', 'West');
set local role service_role;
do $$
declare
  state jsonb := '{"schemaVersion":1,"confirmedSlots":[],"coveredPositions":[],"candidates":{},"injuries":[]}';
  event jsonb := '[{"dedupe_key":"snapshot-fixture:1","event_type":"injury_change","tier":"everything","team_id":"snapshot-fixture","headline":"Fixture: Player is listed as Out","payload":{},"source":"espn_injuries","occurred_at":"2026-10-10T15:00Z"}]';
begin
  if not public.commit_team_event_snapshot('snapshot-fixture',0,'2026-10-10T15:00Z',state,event,'[]') then raise exception 'first commit rejected'; end if;
  if public.commit_team_event_snapshot('snapshot-fixture',0,'2026-10-10T16:00Z',state,event,'[]') then raise exception 'stale revision accepted'; end if;
  if public.commit_team_event_snapshot('snapshot-fixture',1,'2026-10-10T15:00Z',state,event,'[]') then raise exception 'repeat sighting accepted'; end if;
  if public.commit_team_event_snapshot('snapshot-fixture',1,'2026-10-10T14:00Z',state,event,'[]') then raise exception 'older observation accepted'; end if;
  begin
    perform public.commit_team_event_snapshot('snapshot-fixture',1,'2026-10-10T16:00Z',state,jsonb_set(event,'{0,tier}','"invalid"'),'[]');
    raise exception 'invalid event accepted';
  exception when check_violation then null; end;
  if (select revision from public.team_event_snapshot_state where team_id='snapshot-fixture') <> 1 then raise exception 'invalid event advanced state'; end if;
  begin
    perform public.commit_team_event_snapshot('snapshot-fixture',1,'2026-10-10T16:00Z',state,jsonb_set(event,'{0,team_id}','"seahawks"'),'[]');
    raise exception 'foreign team accepted';
  exception when invalid_parameter_value then null; end;
  if not public.commit_team_event_snapshot('snapshot-fixture',1,'2026-10-10T16:00Z',state,event,'[]') then raise exception 'next commit rejected'; end if;
  if (select count(*) from public.team_events where team_id='snapshot-fixture') <> 1 then raise exception 'retry duplicated event'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  if has_table_privilege(current_user, 'public.team_event_snapshot_state', 'INSERT, UPDATE, DELETE') then raise exception 'anon write privilege accepted'; end if;
  begin perform 1 from public.team_event_snapshot_state; raise exception 'anon read accepted'; exception when insufficient_privilege then null; end;
  begin perform public.commit_team_event_snapshot('snapshot-fixture',0,now(),'{}','[]','[]'); raise exception 'anon execution accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  if has_table_privilege(current_user, 'public.team_event_snapshot_state', 'INSERT, UPDATE, DELETE') then raise exception 'authenticated write privilege accepted'; end if;
  begin perform 1 from public.team_event_snapshot_state; raise exception 'authenticated read accepted'; exception when insufficient_privilege then null; end;
  begin perform public.commit_team_event_snapshot('snapshot-fixture',0,now(),'{}','[]','[]'); raise exception 'authenticated execution accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
