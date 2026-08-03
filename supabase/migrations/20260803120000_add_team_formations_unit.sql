-- Defensive real formations (mirror of offense, docs/superpowers/specs/2026-07-07-phase-
-- e-real-formations-design.md's "later mirror" note; see the depth vault ticket "Expand
-- real formations beyond top-3" / DEP-141). `team_formations` gains a `unit` column
-- instead of a new table -- same shape works for both: `alignment`/`personnel` just carry
-- different vocabularies per unit (offense: SHOTGUN/UNDER CENTER/PISTOL + "{RB}{TE}" code;
-- defense: Base/Nickel/Dime/Quarter/Goal Line + "{DL}-{LB}-{DB}" shorthand, derived from
-- defenders_in_box/defense_personnel -- see lib/nflverse/defense-personnel.ts).
--
-- The old PK (team_id, season, rank) is replaced with (team_id, season, unit, rank) so
-- offense and defense each get their own rank-1..3 sequence for the same team/season.
alter table team_formations add column unit text not null default 'offense';

alter table team_formations drop constraint team_formations_pkey;
alter table team_formations add primary key (team_id, season, unit, rank);

alter table team_formations add constraint team_formations_unit_check
  check (unit in ('offense', 'defense'));

alter table team_formations alter column unit drop default;
