-- Feed copy is the complete record; notification copy is deliberately short enough for
-- an iOS lock screen. Nullable columns preserve events written before this migration.
alter table team_events
  add column notification_title text,
  add column notification_body text;
