-- Run with psql -v ON_ERROR_STOP=1 against local Supabase after migrations.
-- Everything rolls back; the role change exercises the real column grant and RLS.
begin;
set local role anon;
insert into public.app_events (event_name) values ('notification_opened');
insert into public.app_events (event_name, app_version) values ('notification_opened', '1.4.2');
-- Every name a shipped build sends is still accepted.
insert into public.app_events (event_name) values ('app_launch');
insert into public.app_events (event_name) values ('depth_chart_reached');
insert into public.app_events (event_name) values ('auth_started');
insert into public.app_events (event_name) values ('auth_completed');
insert into public.app_events (event_name) values ('override_saved');
insert into public.app_events (event_name, error_category) values ('error', 'offline');
do $$
begin
  begin
    insert into public.app_events (event_name) values ('notification_dismissed');
    raise exception 'Accepted an event name outside the allowed list';
  exception when check_violation then null;
  end;
  begin
    insert into public.app_events (event_name, error_category)
      values ('notification_opened', 'offline');
    raise exception 'Accepted an error category on a non-error event';
  exception when check_violation then null;
  end;
end $$;
rollback;
