# iOS Release Compatibility Manifest

The single source of truth for the contract between App Store builds and the Supabase
backend. `web/scripts/check-ios-compatibility.mts` (CI job `ios-compat`) diffs this file on
every PR: a destructive migration must update it in the same PR or CI fails. This is
what enforces web/CLAUDE.md invariant 11 — published data stays decodable by every
supported app build — mechanically instead of by memory.

Background (vault, not this repo): the forced-update gate design
[`../obsidian/Projects/depth/Reference/forced-update-gate.md`](../obsidian/Projects/depth/Reference/forced-update-gate.md)
and the postmortem this guard exists because of,
[`../obsidian/Projects/depth/postmortems/2026-08-24-teams-couldnt-load-testflight.md`](../obsidian/Projects/depth/postmortems/2026-08-24-teams-couldnt-load-testflight.md).

> **Update this file on every release.** Read the build number from App Store Connect
> (`CFBundleVersion` — the integer auto-stamped from the git commit count at archive,
> NOT the marketing version string). A backend PR that changes schema, selected
> columns, JSON shape, enum values, nullability, or payload semantics updates
> "Current contract" below in the same PR.

## Current contract

- **Current App Store build (`CFBundleVersion`):** **587** — submitted for review, **not yet LIVE** (as of 2026-09-08)
- **Minimum supported build (`app_config.minimum_supported_build`):** **1** — the gate is **not armed** (build 587 is not live; arming before the listing is public would lock out the only channel with installs — see `Reference/forced-update-gate.md`, "Do not arm before the listing is public")
- **Gateable floor:** build 321 (T5, #355 — `c6a66bc`). Any build ≥ 321 contains the forced-update gate; the current submission (587) **is gateable**. Once 587 (or a later build) is LIVE, the flow is: ship the new build → confirm the listing is public → **only then** arm the gate by raising `app_config.minimum_supported_build` to that build → after it's live and blocking, destructive backend changes may ship.
- **Backend contract facts** (as of the current schema, `web/supabase/migrations/`):
  - `teams` no longer carries `pending_home_colors` (dropped by
    `20260824102000_drop_pending_home_colors.sql` — the migration implicated in the
    2026-08-24 TestFlight failure).
  - Team colors: `brand_colors` (ESPN-owned, ingest-overwritten) + `uniforms`
    (curated, append-only archive). Jersey palettes come only from `uniforms`.
  - `games.game_type` carries `PRE` rows (ESPN-ingested preseason, ids
    `<season>_PRE_<espnEventId>`, week 0 = Hall of Fame game) alongside nflverse's
    `REG`/`WC`/`DIV`/`CON`/`SB`. Additive, no schema change: build 587's
    `ScheduleMapper` keeps only `REG` rows and is its only `games` reader, so it never
    sees them; newer builds render them under PRESEASON. Any future client reader of
    `games` must filter by an explicit `game_type` allowlist, never "not REG".
  - `app_config` is frozen by contract — the gate reads exactly two columns
    (`minimum_supported_build`, `maintenance_message`) and may never depend on more.
- **Safe to remove legacy columns / change decoded shapes:** only after the
  compatible build is LIVE in the App Store **and** the gate minimum is raised to it.
- **Rollback:** revert the migration's contract change (restore dropped columns / old
  select shape) before lowering the gate; the gate relies on `app_config`, which is
  never broken by the schema it protects.

## Schema change history

| Build | Date | Change | Gate armed? |
| --- | --- | --- | --- |
<!-- add a row per release that changes the client/backend contract -->

## Release sequencing checklist

For any PR that changes the backend contract (sequencing per the vault's
forced-update-gate doc):

- [ ] Does this change affect an existing App Store build?
- [ ] Old columns/values remain readable by the current App Store build
- [ ] New values are understood by the current App Store build
- [ ] TestFlight candidate was tested as an **upgrade from** the current App Store build
- [ ] Compatible build is **LIVE in the App Store** (not approved, not TestFlight)
- [ ] Exact App Store build number (`CFBundleVersion`) recorded above
- [ ] Minimum-supported-build gate tested against an older build
- [ ] Only **now** may destructive schema/data changes be applied

A TestFlight upload is **not** a compatibility milestone — an old TestFlight binary
still selects columns the production migration has already dropped. The gate only
protects builds that contain it, so a pre-gate App Store cohort cannot be protected
retroactively: ship the gate as the first post-launch update, confirm it is live, then
raise the minimum.

## Migration annotation contract

Any destructive migration (anything `web/scripts/check-ios-compatibility.mts` flags —
drop/rename column, alter column type, drop constraint/table, enum value removal,
NOT NULL json/jsonb without default on an existing table) **must** carry this header:

```sql
-- IOS-COMPATIBILITY:
-- Safe after App Store build <CFBundleVersion of the live build> is LIVE.
-- Gate minimum: <minimum_supported_build it pairs with>.
-- Old behavior preserved until then: yes|no.
-- Rollback: <specific steps — which column/constraint/value to restore>.
```

Example (the 2026-08-24 failure shape, for reference):

```sql
-- IOS-COMPATIBILITY:
-- Safe after App Store build <N> is LIVE.
-- Gate minimum: <N>.
-- Old behavior preserved until then: no — this drops a column an old build SELECTs.
-- Rollback: restore the dropped column and update the SELECT contract in
--           web/lib/roster-source.db.ts before lowering the gate.
alter table teams drop column if exists pending_home_colors;
```

The guard is deliberately conservative (a denylist, not a SQL parser): a safe
migration that trips it needs only the annotation; a destructive one that slipped
through would need a broken release. Passing the guard is not approval to ship — the
build must be LIVE in the App Store and the gate armed first.