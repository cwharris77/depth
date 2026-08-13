-- Historic player_stats identity resolution (vault spec
-- 2026-08-13-player-stats-historic-identity-design.md). `players` only ever holds
-- currently-rostered players, so the FK blocked every historic backfill row for a
-- player who isn't on a 2026 roster -- even though nflverse's crosswalk resolves
-- their ESPN id fine. Dropping the FK doesn't touch existing rows (all of them
-- already satisfy it, having been written through the current-roster gate) and
-- doesn't change the identity space -- player_id stays an ESPN id, just no longer
-- required to exist in `players`.
alter table player_stats drop constraint player_stats_player_id_fkey;
