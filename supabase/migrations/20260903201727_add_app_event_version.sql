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
grant insert (app_version) on public.app_events to anon, authenticated;
