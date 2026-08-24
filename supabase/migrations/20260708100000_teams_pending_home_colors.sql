-- Stability-guard state for the ESPN drift reconciler (Phase 7 PR-B). Holds the candidate
-- home hexes first seen in a prior weekly pull plus the runId (season+ISO-week) of that
-- sighting: a later pull with the same colors and a DIFFERENT runId is the second
-- confirmation that promotes. Null when no change is pending. Shape:
--   { "primary": "#RRGGBB", "secondary": "#RRGGBB", "runId": "2027-W11" }
alter table teams add column pending_home_colors jsonb;
