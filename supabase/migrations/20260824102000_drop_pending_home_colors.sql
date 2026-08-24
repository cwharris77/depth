-- The ESPN-to-home drift reconciler is gone; its staging state has no remaining writer.
-- IF EXISTS keeps fresh resets valid after removal of the old add-column migration.
alter table teams drop column if exists pending_home_colors;
