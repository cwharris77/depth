-- One current home kit and one current away kit per team, checked at COMMIT.
--
-- Why this matters more than a duplicate archive row: iOS resolves a team's entire palette
-- with `uniforms.first(where: { $0.kind == .home && $0.isCurrent })`
-- (ios/Depth/Data/TeamSnapshotMapper.swift) over an UNORDERED PostgREST result. A second
-- current home row makes the team's colors -- field, badges, every accent -- nondeterministic
-- and able to differ between fetches. The web resolves the same way.
--
-- Nothing caught this before. `uniforms_current_year_end_consistent` (20260824101000) only
-- ties is_current to year_end, which a duplicate satisfies happily: both rows can carry
-- year_end null and is_current true.
--
-- The failure mode is specific and likely, because retiring a kit is a flag and not a delete
-- (the archive is append-only, AGENTS.md invariant 9): "appended the new home row, forgot to
-- retire the old one" is exactly the shape of a uniform redesign, which is entirely manual --
-- no ingest or reconciler writes this table.
--
-- WHY A DEFERRED TRIGGER AND NOT A PARTIAL UNIQUE INDEX. The obvious
--   create unique index ... on uniforms (team_id, kind) where is_current and kind in (...)
-- is enforced per-row *during* a statement, and `npm run gen:uniform-seed` emits every kit as
-- ONE multi-row `insert ... on conflict (id) do update`. A home swap puts the new current row
-- and the old row's retirement in that same statement, so whenever the new row happens to be
-- ordered first the migration dies with a duplicate-key error -- the constraint would break
-- precisely the operation it exists to protect, and only on the first real swap, long after
-- it passed CI against unchanged data. Verified by executing that exact upsert against a
-- local Postgres. A partial unique *index* cannot be deferred, and a unique *constraint*
-- (which can) cannot be partial, so the check is a constraint trigger instead: intra-
-- statement ordering stops mattering, and the invariant is asserted once the transaction
-- settles.
--
-- Deliberately scoped to home/away. throwback, alternate and color-rush are legitimately
-- multiple-current -- 3 teams currently carry two current alternates (e.g. the Rams' Bone
-- and Rivalries kits) -- so covering every kind would reject valid curated data.
--
-- Verified against the curated archive before adding: 98 current rows of 105, zero
-- home/away duplicates, and all 32 teams already carry exactly one current home and one
-- current away. This is a no-op on today's data and a guard on tomorrow's.

create or replace function uniforms_assert_one_current_home_away()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  -- Only the row just written can create a duplicate, so check its (team_id, kind) bucket
  -- rather than scanning the table -- `uniforms_team_id_is_current_idx` already covers it.
  if new.is_current and new.kind in ('home', 'away') then
    select count(*)
      into current_count
      from uniforms
     where team_id = new.team_id
       and kind = new.kind
       and is_current;

    if current_count > 1 then
      raise exception
        'team % has % current % kits; exactly one is allowed. Retire the previous kit '
        'in the same transaction (is_current = false, year_end set) rather than deleting it.',
        new.team_id, current_count, new.kind
        using errcode = 'unique_violation';
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists uniforms_one_current_home_away on uniforms;

create constraint trigger uniforms_one_current_home_away
  after insert or update on uniforms
  deferrable initially deferred
  for each row
  execute function uniforms_assert_one_current_home_away();
