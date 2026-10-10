-- Run with psql -v ON_ERROR_STOP=1 against local Supabase after migrations.
-- Everything rolls back; role changes exercise the real grants.
begin;

set local role anon;
select public.register_push_device(
  repeat('a', 64), 'seahawks', 'big_moments', 'com.cwharris.depth.dev', 'sandbox');
reset role;

do $$
declare first_after timestamptz;
begin
  if (select count(*) from public.push_devices where apns_token = repeat('a', 64)) <> 1 then
    raise exception 'registration did not write one row';
  end if;
  select notify_after into first_after from public.push_devices where apns_token = repeat('a', 64);

  -- Same token, same team, tier change that is not a return from off: one row, and the
  -- `notify_after` cutoff does not move.
  perform public.register_push_device(
    repeat('a', 64), 'seahawks', 'everything', 'com.cwharris.depth.dev', 'sandbox');
  if (select count(*) from public.push_devices where apns_token = repeat('a', 64)) <> 1 then
    raise exception 'second registration duplicated the device';
  end if;
  if (select tier from public.push_devices where apns_token = repeat('a', 64)) <> 'everything' then
    raise exception 'tier was not updated';
  end if;
  if (select notify_after from public.push_devices where apns_token = repeat('a', 64)) <> first_after then
    raise exception 'notify_after moved on a plain tier change';
  end if;

  -- A team change moves the cutoff. clock_timestamp() advances inside a transaction.
  perform pg_sleep(0.01);
  perform public.register_push_device(
    repeat('a', 64), 'bills', 'everything', 'com.cwharris.depth.dev', 'sandbox');
  if (select notify_after from public.push_devices where apns_token = repeat('a', 64)) <= first_after then
    raise exception 'notify_after did not move on a team change';
  end if;

  -- So does coming back from off.
  perform public.register_push_device(
    repeat('a', 64), 'bills', 'off', 'com.cwharris.depth.dev', 'sandbox');
  select notify_after into first_after from public.push_devices where apns_token = repeat('a', 64);
  perform pg_sleep(0.01);
  perform public.register_push_device(
    repeat('a', 64), 'bills', 'big_moments', 'com.cwharris.depth.dev', 'sandbox');
  if (select notify_after from public.push_devices where apns_token = repeat('a', 64)) <= first_after then
    raise exception 'notify_after did not move on a return from off';
  end if;
end $$;

-- Every malformed call is rejected and writes nothing.
do $$
declare
  bad record;
  before_count bigint := (select count(*) from public.push_devices);
begin
  for bad in
    select * from (values
      ('not-hex',        'seahawks', 'big_moments', 'com.cwharris.depth.dev', 'sandbox'),
      (repeat('a', 63),  'seahawks', 'big_moments', 'com.cwharris.depth.dev', 'sandbox'),
      (repeat('A', 64),  'seahawks', 'big_moments', 'com.cwharris.depth.dev', 'sandbox'),
      (repeat('b', 64),  'no-such-team', 'big_moments', 'com.cwharris.depth.dev', 'sandbox'),
      (repeat('b', 64),  'seahawks', 'daily', 'com.cwharris.depth.dev', 'sandbox'),
      (repeat('b', 64),  'seahawks', 'big_moments', 'com.example.other', 'sandbox'),
      (repeat('b', 64),  'seahawks', 'big_moments', 'com.cwharris.depth.dev', 'staging')
    ) as t(token, team, tier, bundle, env)
  loop
    begin
      perform public.register_push_device(bad.token, bad.team, bad.tier, bad.bundle, bad.env);
      raise exception 'accepted an invalid registration: %', bad;
    exception
      when invalid_parameter_value or check_violation or foreign_key_violation then null;
    end;
  end loop;
  if (select count(*) from public.push_devices) <> before_count then
    raise exception 'a rejected registration wrote a row';
  end if;
end $$;

-- Clients can call the function and nothing else.
set local role anon;
do $$
begin
  begin
    perform 1 from public.push_devices limit 1;
    raise exception 'anon can read push_devices';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.push_devices (apns_token, team_id, tier, bundle_id, apns_environment)
      values (repeat('c', 64), 'seahawks', 'big_moments', 'com.cwharris.depth.dev', 'sandbox');
    raise exception 'anon can insert into push_devices directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.team_event_deliveries limit 1;
    raise exception 'anon can read team_event_deliveries';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
