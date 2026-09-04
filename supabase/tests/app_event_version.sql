-- DEP-322: run with psql -v ON_ERROR_STOP=1 against local Supabase after migrations.
-- Everything rolls back; role changes exercise real column grants and RLS.
begin;
create temporary table event_baseline as select count(*) as total from public.app_events;
set local role anon;
insert into public.app_events (event_name) values ('app_launch');
insert into public.app_events (event_name, error_category) values ('error', 'offline');
insert into public.app_events (event_name, app_version) values ('app_launch', '1.4.2');
set local role authenticated;
insert into public.app_events (event_name) values ('app_launch');
insert into public.app_events (event_name, error_category, app_version)
  values ('error', 'offline', '1.4.2');
insert into public.app_events (event_name, app_version) values ('app_launch', null);
reset role;
do $$
begin
  if (select count(*) from public.app_events) <> (select total + 6 from event_baseline) then
    raise exception 'Old/new client inserts did not all persist';
  end if;
  if exists (select 1 from public.app_events where app_version = '1.4.2' and created_at is null) then
    raise exception 'Server timestamps missing';
  end if;
end $$;
set local role anon;
do $$
declare invalid_version text;
begin
  foreach invalid_version in array array['', '1.4.2 (123)', 'iOS 26.5', '1.2.3.4', repeat('1', 33)] loop
    begin
      insert into public.app_events (event_name, app_version) values ('app_launch', invalid_version);
      raise exception 'Accepted invalid version: %', invalid_version;
    exception when check_violation then null;
    end;
  end loop;
  begin
    perform * from public.app_events;
    raise exception 'Client SELECT unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.app_events (event_name, app_version, created_at)
      values ('app_launch', '1.4.2', now());
    raise exception 'Client timestamp unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
