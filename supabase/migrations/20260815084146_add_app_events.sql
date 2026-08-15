-- Privacy-minimal native-app product usage counters (Task 8F, design spec Milestone 2B
-- item 26: "privacy-minimal analytics only after documenting their App Privacy
-- effects" -- see docs/ios-privacy-telemetry.md). Deliberately unlinked: no user id,
-- device id, or session id is stored, only a fixed event name and a server timestamp
-- -- this table can never identify or track an individual, by construction. A CHECK
-- constraint on both columns closes the door on smuggling free-text/PII through the
-- event/error fields; there is nowhere in the schema for that data to go.
create table app_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'app_launch',
    'depth_chart_reached',
    'auth_started',
    'auth_completed',
    'override_saved',
    'error'
  )),
  -- Non-sensitive DepthError case name -- present iff event_name = 'error'.
  error_category text check (
    (event_name = 'error') = (error_category is not null)
    and (
      error_category is null
      or error_category in (
        'notFound', 'offline', 'unauthenticated', 'permissionDenied',
        'validation', 'incompatibleBuild', 'server', 'decoding'
      )
    )
  ),
  created_at timestamptz not null default now()
);

comment on table app_events is
  'Privacy-minimal native-app usage counters -- event name + timestamp only, never linked to a user or device.';

-- Clients only ever insert their own fire-and-forget event; nobody reads through RLS
-- -- aggregate analysis happens via the service role, which bypasses RLS by design, so
-- no anon/authenticated read policy is needed here (AGENTS.md invariant 10's "read
-- policy for whoever reads it" reader is the service role, not a client). Column-
-- restricted to event_name/error_category only -- an unrestricted grant would let a
-- client set id/created_at explicitly, overriding the server-assigned defaults and
-- forging timestamps that corrupt time-based aggregate analytics (Greptile review on
-- depth#368).
grant insert (event_name, error_category) on app_events to anon, authenticated;
grant select, insert, update, delete on app_events to service_role;

alter table app_events enable row level security;

create policy "anyone can record an event" on app_events
  for insert to anon, authenticated with check (true);
