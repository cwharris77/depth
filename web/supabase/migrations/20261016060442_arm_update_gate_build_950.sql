-- Build 950 (The Sticks 1.1) is publicly available on the App Store as of 2026-10-15.
-- Raise the minimum from 764 so older builds update before breaking backend changes ship.
update public.app_config
set minimum_supported_build = 950,
    updated_at = now()
where id = true;
