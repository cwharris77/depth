-- DEP-315 keeps nflverse's bounded pregame market snapshot on the existing shared
-- game row. nflverse's spread_line is home-oriented (positive means the designated
-- home team is favored); lib/utils/compare/market-lines.ts owns display orientation
-- and vig removal so raw source values remain auditable here.
--
-- Every field is nullable because future games can exist before a line posts and older
-- seasons may lack side prices. `market_updated_at` is Depth's observation time, not a
-- claimed bookmaker timestamp: the source provides current values without line history.
alter table games
  add column location text,
  add column away_moneyline numeric,
  add column home_moneyline numeric,
  add column spread_line numeric,
  add column away_spread_odds numeric,
  add column home_spread_odds numeric,
  add column total_line numeric,
  add column under_odds numeric,
  add column over_odds numeric,
  add column market_updated_at timestamptz;

comment on column games.location is
  'nflverse venue designation: Home or Neutral; designated teams remain home/away either way';
comment on column games.spread_line is
  'nflverse home-oriented spread: positive means home favored, negative means away favored';
comment on column games.market_updated_at is
  'Timestamp when Depth last observed a posted nflverse market snapshot for this game';
