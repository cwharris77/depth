-- Cross-device sync for custom depth-chart order (Phase C, override-sync pass --
-- docs/superpowers/specs/2026-07-07-phase-c-auth-and-saved-boards-design.md, "Overlay sync").
-- One row per (user, team, position): the user's ordered player ids at that position,
-- mirroring lib/depth-overrides.ts TeamDepthOverride (Partial<Record<Position, string[]>>).
-- Until now the overlay lived only in localStorage (single device); this makes a signed-in
-- user's custom order durable and cross-device. Signed out persists nothing (account-gated).

-- The v0 stub never matched the shipped overlay semantics (it can't hold ordered arrays)
-- and holds no data -- depth_overrides replaces it. See init_depth_schema.sql.
drop table if exists roster_overlays;

create table depth_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references teams(id) on delete cascade,
  position text not null,
  player_ids text[] not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, team_id, position)
);

-- Explicit privileges (see 20260701171029_grant_default_table_privileges.sql). Per-user
-- private, like user_settings: authenticated (rows further scoped by the RLS policy below)
-- and service_role only -- anon is excluded, because overrides are never read with the
-- public anon key the way the base tables are.
grant select, insert, update, delete on depth_overrides to authenticated, service_role;

-- RLS scoped to this new table only. The public base tables (teams/players/...) stay
-- RLS-off: their read policies ride with the deferred full-RLS/share pass, because
-- dbRosterSource reads them with the anon key (AGENTS.md invariant 10). Owner-only CRUD.
alter table depth_overrides enable row level security;

create policy "own overrides" on depth_overrides
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
