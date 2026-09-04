-- DEP-322: attribute counters to marketing releases without collecting build/OS
-- versions or identifiers. NULL preserves historical rows and submitted clients.
alter table public.app_events
  add column app_version text check (
    app_version is null or (
      octet_length(app_version) <= 32
      and app_version ~ '^[0-9]+(\.[0-9]+){0,2}$'
    )
  );

comment on column public.app_events.app_version is
  'Full marketing app version (e.g. 1.4.2); NULL for older clients or unavailable metadata. No build or OS version.';
comment on table public.app_events is
  'Privacy-minimal native-app counters: event, error category, marketing version, server timestamp; no user/device linkage.';

-- Preserve insert-only access and server ownership of id/created_at. RLS unchanged.
-- Supabase pre-grants ALL (SELECT/INSERT/UPDATE/DELETE/TRUNCATE...) to anon and
-- authenticated on every public table, so the original migration's column grant was
-- a no-op and created_at/id were forgeable (DEP-322). Revoke the blanket ALL first,
-- then grant exactly the columns clients may set; nothing reads app_events through
-- an anon/authenticated client (aggregates use the service role), so the revoke
-- breaks no reader.
revoke all on table public.app_events from anon, authenticated;
grant insert (event_name, error_category, app_version) on public.app_events to anon, authenticated;
