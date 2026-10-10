-- One more counter the app may record: a notification was opened. Like every other
-- row here it carries no user, device or notification identifier.
--
-- Widening only: every name an installed build already sends stays allowed.
--
-- IOS-COMPATIBILITY:
-- Safe after App Store build 764 is LIVE.
-- Gate minimum: 764.
-- Old behavior preserved until then: yes. The constraint is dropped only to be re-added
--   in the same transaction with one more allowed value; no insert a build makes today
--   is rejected.
-- Rollback: delete rows where event_name = 'notification_opened', then drop the
--   constraint and re-add it with the six earlier names.
alter table public.app_events drop constraint app_events_event_name_check;
alter table public.app_events add constraint app_events_event_name_check check (
  event_name in (
    'app_launch',
    'depth_chart_reached',
    'auth_started',
    'auth_completed',
    'override_saved',
    'error',
    'notification_opened'
  )
);
