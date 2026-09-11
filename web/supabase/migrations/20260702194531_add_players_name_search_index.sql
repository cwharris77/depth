-- All-player search (searches every team's roster, not just the one the client has
-- loaded) does a substring ILIKE on players.name. pg_trgm + a GIN trigram index keeps
-- that fast as the table grows past the current ~2,000 rows (all-time teams, custom
-- rosters), instead of relying on a sequential scan staying cheap by accident.
create extension if not exists pg_trgm;

create index players_name_trgm_idx on players using gin (name gin_trgm_ops);
