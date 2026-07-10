-- Per-user settings for the opt-in account system (Phase C, auth pass 1 --
-- docs/superpowers/specs/2026-07-09-auth-account-and-user-settings-design.md).
-- One row per authenticated user, holding the two team preferences the app persists:
-- the last team they viewed and an optional favorite. The home route resolves the
-- startup team from these (favorite -> last -> default). Both are nullable team refs
-- so a deleted/renamed team clears the setting instead of dangling.
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_team_id text references teams(id) on delete set null,
  last_team_id text references teams(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Table privileges must be explicit in CLI migrations (see
-- 20260701171029_grant_default_table_privileges.sql). This table is per-user private,
-- so only authenticated (rows further scoped by the RLS policy below) and service_role
-- get access -- anon is deliberately excluded, unlike the public base tables.
grant select, insert, update, delete on user_settings to authenticated, service_role;

-- RLS turns ON here -- this is the auth phase the vault Schema.md deferred it to. Scoped
-- to this new table only: the public base tables (teams/players/...) stay RLS-off until
-- their read policies ship with override-sync, because dbRosterSource reads them with the
-- anon key (AGENTS.md invariant 10). A user may only see and write their own row.
alter table user_settings enable row level security;

create policy "own settings" on user_settings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
