-- Per-run diagnostics, kept apart from `errors`/`status`: what an ingest dropped and why
-- (per-reason counts, unmapped source values). A run can record success while reporting
-- drops here, so diagnostics are always visible without deciding the run's status.
alter table public.ingestion_runs add column diagnostics jsonb;
