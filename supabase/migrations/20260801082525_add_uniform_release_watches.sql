-- Dedupe state for the SportsLogos.net News monitor (scripts/check-uniform-releases.mts).
-- Records which News items have already opened a "new unveiling" GitHub issue, so a weekly
-- rerun doesn't reopen an issue for the same item. Operational only -- nothing client-side
-- reads it -- so it gets RLS-on with no read policy, same posture as ingestion_runs (see
-- 20260710140000_base_table_rls.sql): the service-role script still reads/writes it (RLS
-- bypassed), anon/authenticated see zero rows.

create table uniform_release_watches (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique,
  title text not null,
  notified_at timestamptz not null default now()
);

grant select, insert, update, delete on uniform_release_watches to anon, authenticated, service_role;

alter table uniform_release_watches enable row level security;
