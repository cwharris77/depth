-- Adds the "open my favorite team at startup" toggle to user_settings (Phase C, auth
-- pass 1 design revision, 2026-07-09). Separate from favorite_team_id: a user can have a
-- favorite but choose not to auto-open it. Defaults true so setting a favorite opts you
-- in by default; it's only consulted when favorite_team_id is set (see lib/home-team.ts
-- resolveStartupTeam). Additive column with a default -> existing rows backfill to true.
alter table user_settings
  add column start_on_favorite boolean not null default true;
