-- One row per device that has asked for team notifications. The APNs token is the
-- identity: there is no account link, so a signed-out device can subscribe. `tier` is
-- 'off' rather than a deleted row so a device that turns notifications back on keeps
-- its team.
--
-- `notify_after` is the delivery cutoff: a device is only sent events created after
-- it. It moves when the device first registers, changes team, or returns from 'off'.
create table push_devices (
  id uuid primary key default gen_random_uuid(),
  apns_token text not null unique check (apns_token ~ '^[0-9a-f]{64,200}$'),
  team_id text not null references teams(id) on delete cascade,
  tier text not null check (tier in ('big_moments', 'everything', 'off')),
  bundle_id text not null check (
    bundle_id in ('com.cwharris.depth', 'com.cwharris.depth.staging', 'com.cwharris.depth.dev')
  ),
  apns_environment text not null check (apns_environment in ('production', 'sandbox')),
  notify_after timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_devices_team_idx on push_devices (team_id) where tier <> 'off';

comment on table push_devices is
  'Devices subscribed to team notifications. Written through register_push_device; read only by the service role.';

-- No client reads or writes the table directly. Revoke first: tables here inherit ALL
-- for the client roles by default.
revoke all on push_devices from anon, authenticated;
grant select, insert, update, delete on push_devices to service_role;
alter table push_devices enable row level security;

-- The sent marker. A row means the sender has claimed that event for that device, so
-- a second run, or an overlapping one, cannot send it again.
create table team_event_deliveries (
  event_id uuid not null references team_events(id) on delete cascade,
  device_id uuid not null references push_devices(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (event_id, device_id)
);

comment on table team_event_deliveries is
  'Sender working state: one row per (event, device) claimed for delivery. Service role only.';

revoke all on team_event_deliveries from anon, authenticated;
grant select, insert, update, delete on team_event_deliveries to service_role;
alter table team_event_deliveries enable row level security;

-- The only client entry point. Security definer so a client needs no table privilege;
-- knowing a token is what authorizes changing that token's row. Inputs are checked
-- here for a clear error, and again by the table constraints.
create or replace function public.register_push_device(
  p_token text,
  p_team_id text,
  p_tier text,
  p_bundle_id text,
  p_environment text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64,200}$' then
    raise invalid_parameter_value using message = 'token must be lowercase hex';
  end if;
  if p_tier is null or p_tier not in ('big_moments', 'everything', 'off') then
    raise invalid_parameter_value using message = 'unknown tier';
  end if;
  if p_environment is null or p_environment not in ('production', 'sandbox') then
    raise invalid_parameter_value using message = 'unknown environment';
  end if;
  if p_bundle_id is null or p_bundle_id not in (
    'com.cwharris.depth', 'com.cwharris.depth.staging', 'com.cwharris.depth.dev'
  ) then
    raise invalid_parameter_value using message = 'unknown bundle id';
  end if;
  if not exists (select 1 from public.teams where id = p_team_id) then
    raise invalid_parameter_value using message = 'unknown team';
  end if;

  insert into public.push_devices as d
    (apns_token, team_id, tier, bundle_id, apns_environment)
  values (p_token, p_team_id, p_tier, p_bundle_id, p_environment)
  on conflict (apns_token) do update set
    notify_after = case
      when d.team_id <> excluded.team_id or (d.tier = 'off' and excluded.tier <> 'off')
        then clock_timestamp()
      else d.notify_after
    end,
    team_id = excluded.team_id,
    tier = excluded.tier,
    bundle_id = excluded.bundle_id,
    apns_environment = excluded.apns_environment,
    updated_at = now();
end;
$$;

revoke all on function public.register_push_device(text, text, text, text, text) from public;
grant execute on function public.register_push_device(text, text, text, text, text)
  to anon, authenticated, service_role;
