-- Public app_config singleton backing the native iOS update gate (T5, native iOS app
-- design spec's "Database evolution and update gate"). A build below
-- minimum_supported_build shows a blocking update screen; the app caches the last
-- known value and continues on fetch failure rather than bricking first launch.

create table app_config (
  id boolean primary key default true,
  minimum_supported_build integer not null default 1,
  maintenance_message text,
  updated_at timestamptz not null default now(),
  constraint app_config_singleton check (id)
);

insert into app_config (id, minimum_supported_build) values (true, 1);

-- A raw CLI migration doesn't auto-grant table privileges the way the hosted
-- dashboard/API does (see 20260701171029_grant_default_table_privileges.sql) -- without
-- this, RLS's "public read" policy below is unreachable and every anon/authenticated
-- read 42501s before RLS even evaluates. service_role gets full privileges so ingest-
-- adjacent tooling (not the app -- no client ever writes this table) can update the
-- minimum build.
grant select on app_config to anon, authenticated;
grant select, insert, update, delete on app_config to service_role;

alter table app_config enable row level security;

-- Read-only for anon + authenticated, same pattern as the other public snapshot tables
-- (20260710140000_base_table_rls.sql) -- no write policy, so only service-role (ingest-
-- adjacent tooling, not the app) can update the minimum build.
create policy "public read" on app_config for select to anon, authenticated using (true);
