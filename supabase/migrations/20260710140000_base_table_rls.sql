-- Full RLS rollout on the public base tables (Phase C, final pass -- closes the deferral in
-- docs/superpowers/specs/2026-07-07-phase-c-auth-and-saved-boards-design.md and docs/espn.md).
-- Turns RLS ON for the six base tables, so every table in the schema is now protected. Reads
-- stay open where the app needs them: dbRosterSource reads teams / players / depth_chart_entries
-- / special_teams_slots / uniforms with the anon key, so each gets a permissive public-read
-- policy -- and because the policy and the enable land in the same migration, there is no window
-- where reads break (AGENTS.md invariant 10). Writes are unaffected: the ESPN ingest writes with
-- the service-role key, which bypasses RLS entirely (invariants 3/7).

alter table teams enable row level security;
alter table players enable row level security;
alter table depth_chart_entries enable row level security;
alter table special_teams_slots enable row level security;
alter table uniforms enable row level security;
alter table ingestion_runs enable row level security;

-- The five tables the app reads with the anon key: public, read-only for anon + authenticated.
create policy "public read" on teams for select to anon, authenticated using (true);
create policy "public read" on players for select to anon, authenticated using (true);
create policy "public read" on depth_chart_entries for select to anon, authenticated using (true);
create policy "public read" on special_teams_slots for select to anon, authenticated using (true);
create policy "public read" on uniforms for select to anon, authenticated using (true);

-- ingestion_runs is operational only -- nothing client-side reads it (verified) -- so it gets no
-- read policy: RLS-on with no policy means anon/authenticated see zero rows, while the
-- service-role ingest still reads/writes it (RLS bypassed). Least privilege by default.
