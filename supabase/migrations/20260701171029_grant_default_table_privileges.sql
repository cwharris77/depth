-- Explicit grants for the depth schema. Supabase's hosted dashboard/API auto-grants
-- these when tables are created through it; a raw CLI migration does not, so a fresh
-- local `supabase start` ends up with tables that exist but reject every read/write
-- from the anon/service_role keys the app actually uses. Making it explicit here
-- keeps local and hosted environments in parity instead of relying on implicit
-- platform behavior. RLS is intentionally still disabled (see Schema.md in the vault)
-- pending auth/policy design -- this grant does not change that, it only makes the
-- underlying table privileges match what the hosted project already had.
grant select, insert, update, delete
  on teams, players, depth_chart_entries, special_teams_slots, ingestion_runs, roster_overlays
  to anon, authenticated, service_role;
