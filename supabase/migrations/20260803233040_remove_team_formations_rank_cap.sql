-- DEP-141 ("Expand real formations beyond top-3"): the accumulator/query cap is lifted
-- in the same PR, and the table's `rank between 1 and 3` CHECK was the last hard cap --
-- without dropping it, any row past rank 3 fails to insert regardless of app-layer
-- changes. No practical replacement cap (Cooper, 2026-08-03: show every combo the
-- coverage-gated accumulator records, no minimum threshold) -- rank just needs to stay
-- a positive integer.
alter table team_formations drop constraint team_formations_rank_check;
alter table team_formations add constraint team_formations_rank_check check (rank > 0);
