-- Share-by-reference for custom depth charts (Phase C, share pass --
-- docs/superpowers/specs/2026-07-07-phase-c-auth-and-saved-boards-design.md, "Share-by-reference").
-- A share is a durable *reference* to the owner's live override for a team, not a snapshot:
-- the link keeps resolving to whatever the owner currently has saved, so it updates as they
-- keep editing. One live share per (user, team); the slug is the public handle (lib/slug.ts).

create table shared_boards (
  slug text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null references teams(id) on delete cascade,
  owner_name text not null, -- denormalized email local-part at share time (no profiles table)
  created_at timestamptz not null default now(),
  unique (user_id, team_id)
);

-- anon may resolve a slug (the whole point of a public share link); authenticated may also
-- create/revoke their own shares; service_role for completeness. Rows scoped by RLS below.
grant select on shared_boards to anon;
grant select, insert, delete on shared_boards to authenticated, service_role;

alter table shared_boards enable row level security;

-- Anyone can resolve a slug; only the owner creates or deletes their own shares.
create policy "public read" on shared_boards for select to anon, authenticated using (true);
create policy "own shares insert" on shared_boards
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own shares delete" on shared_boards
  for delete to authenticated using (auth.uid() = user_id);

-- Resolving a share must read the owner's depth_overrides rows, which are otherwise owner-only
-- (20260710120000_depth_overrides). Open a *scoped* window: an override row is publicly
-- readable exactly when a shared_boards row references its (user_id, team_id) -- nothing else
-- leaks, and non-shared overrides stay private. This is additive to the owner-only policy
-- (RLS permissive policies OR together). The base tables' full RLS rollout stays deferred --
-- they're still read with the anon key (AGENTS.md invariant 10).
grant select on depth_overrides to anon;
create policy "shared overrides are public read" on depth_overrides
  for select to anon, authenticated
  using (
    exists (
      select 1
      from shared_boards s
      where s.user_id = depth_overrides.user_id
        and s.team_id = depth_overrides.team_id
    )
  );
