-- Jobs a player held on top of his position in a past season: nickel back (`nb`), kick
-- returner (`kr`), punt returner (`pr`). A map from role to the club's depth rank for that
-- role, 1 being the starter, e.g. {"nb": 1, "kr": 2}. Kept beside `position` rather than in
-- it, because a nickel back is still a corner or safety and a returner still has an
-- everyday position. Null when the player held no role or the season has no depth chart.
alter table roster_history add column roles jsonb;
