-- Phase E coaches (docs/superpowers/specs/2026-07-07-phase-e-coaches-design.md). The site
-- roster endpoint the ingest already fetches exposes a head coach; ESPN doesn't expose the
-- rest of the staff cheaply, so this is one coach per team, not a `coaches` table (YAGNI
-- until a staff source exists). Nullable: missing/empty coach array on ingest -> nulls.
alter table teams
  add column coach_name text,
  add column coach_espn_id text,
  add column coach_experience int;
