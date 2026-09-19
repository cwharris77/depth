-- Backfills the 2026 `team_coach_seasons` rows the curated seed never got to (DEP-597).
--
-- 20260714140000_seed_team_coach_seasons.sql populated 2023-2025 by hand and said so:
-- "This table does not self-update: the next time the 3-season window rolls forward ...
-- a new migration must append that season's row for all 32 teams the same way." That
-- never happened, so through the 2026 season the stats page had no coach row for the
-- season being played -- a first-year HC fell through to the "HEAD COACH · INCOMING"
-- label and stayed there (the Bills under Joe Brady).
--
-- scripts/ingest-espn.mts now writes this row on every run, so this is the last such
-- migration: it closes the one-season gap immediately rather than waiting for the next
-- ingest, and future seasons arrive on their own.
--
-- Derived in SQL from the table's own 2025 rows rather than a hand-typed list of 32
-- names, applying exactly the rule lib/espn/coach-seasons.ts uses: same coach as last
-- season -> one more season with the team, anyone else -> their 1st. `teams.coach_name`
-- is ESPN's live current head coach (rewritten by every ingest); note that
-- `teams.coach_experience` is deliberately NOT used here -- it counts *career* seasons,
-- while this column counts seasons with this team.
insert into team_coach_seasons (team_id, season, coach_name, coach_experience, source)
select
  t.id,
  2026,
  t.coach_name,
  case when prev.coach_name = t.coach_name then prev.coach_experience + 1 else 1 end,
  'espn'
from teams t
join team_coach_seasons prev on prev.team_id = t.id and prev.season = 2025
where t.coach_name is not null
-- An ingest run may already have written 2026 before this migration applies; its row is
-- computed the same way and is at least as fresh, so never stomp it.
on conflict (team_id, season) do nothing;
