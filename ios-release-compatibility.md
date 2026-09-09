# iOS Release Compatibility Manifest

The single source of truth for the contract between App Store builds and the Supabase
backend. `scripts/check-ios-compatibility.mts` (CI job `ios-compat`) diffs this file on
every PR: a destructive migration must update it in the same PR or CI fails. This is
what enforces CLAUDE.md invariant 11 — published data stays decodable by every
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

- **Current App Store build (`CFBundleVersion`):** <!-- fill in from App Store Connect -->
- **Minimum supported build (`app_config.minimum_supported_build`):** <!-- fill in; 1 until armed — the gate shipped in T5 (7c4d88d, #355) and only protects builds that contain it -->
- **Backend contract facts** (as of the current schema, `supabase/migrations/`):
  - `teams` no longer carries `pending_home_colors` (dropped by
    `20260824102000_drop_pending_home_colors.sql` — the migration implicated in the
    2026-08-24 TestFlight failure).
  - Team colors: `brand_colors` (ESPN-owned, ingest-overwritten) + `uniforms`
    (curated, append-only archive). Jersey palettes come only from `uniforms`.
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

Any destructive migration (anything `scripts/check-ios-compatibility.mts` flags —
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
--           lib/roster-source.db.ts before lowering the gate.
alter table teams drop column if exists pending_home_colors;
```

The guard is deliberately conservative (a denylist, not a SQL parser): a safe
migration that trips it needs only the annotation; a destructive one that slipped
through would need a broken release. Passing the guard is not approval to ship — the
build must be LIVE in the App Store and the gate armed first.