-- Uniform archive, phase 2 (labeled kits). Every kit becomes a first-class, labeled row:
--   * kind   -- 'home' | 'away' | 'throwback' | 'color-rush' | 'alternate'
--   * source -- 'espn' (machine-owned home rows) | 'curated' (hand-authored, from data.ts)
-- The team's home look, previously synthesized from teams.colors at read time, becomes a
-- real row here (one per team, is_current). teams.colors stays the ESPN landing spot; the
-- drift reconciler that pins home rows on a rebrand lands in a follow-up (PR-B).
--
-- Strict column order matters: the table already holds the 4 curated rows from
-- 20260705043556, so a bare `add column ... not null` would fail. Add nullable, backfill,
-- THEN set not null.

-- 1. Nullable columns.
alter table uniforms add column kind text;
alter table uniforms add column source text;

-- 2. Label the 4 existing curated rows (all throwback-style, hand-authored).
update uniforms set kind = 'throwback', source = 'curated';

-- 3. Backfill one current home row per team from teams.colors. Null years so
--    formatUniformYears renders "Current" (not "2026-present"). id = `${team}-home`, the
--    permanent slug for a team's current home (PR-B gives RETIRED snapshots the year suffix).
insert into uniforms (
  id, team_id, kind, name, source, year_start, year_end, is_current,
  color_primary, color_secondary, color_accent, ui_accent, on_accent
)
select
  id || '-home', id, 'home', 'Home', 'espn', null, null, true,
  color_primary, color_secondary, color_accent, ui_accent, on_accent
from teams;

-- 4. Now every row has both; enforce not null.
alter table uniforms
  alter column kind set not null,
  alter column source set not null;

-- 5. Index for "list a team's kits, filtered/grouped by type".
create index uniforms_team_id_kind_idx on uniforms(team_id, kind);
