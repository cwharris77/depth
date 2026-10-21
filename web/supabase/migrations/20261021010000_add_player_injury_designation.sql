-- ESPN's injury designation for a player on its injury report (Questionable, Doubtful,
-- Out, Injured Reserve, ...). `status` stays 'injured' for these players so installed
-- builds keep their badge; this column only refines the label. Null for healthy players
-- and for rows written before the ingest filled it.
alter table public.players add column injury_designation text;
