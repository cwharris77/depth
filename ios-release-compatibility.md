# iOS Release Compatibility Manifest

The single source of truth for the contract between App Store builds and the Supabase
backend. `web/scripts/check-ios-compatibility.mts` (CI job `ios-compat`) diffs this file on
every PR: a destructive migration must update it in the same PR or CI fails. It enforces
one rule mechanically: published data stays decodable by every supported app build.

> **Update this file on every release.** Read the build number from App Store Connect
> (`CFBundleVersion` — the integer auto-stamped from the git commit count at archive,
> NOT the marketing version string). A backend PR that changes schema, selected
> columns, JSON shape, enum values, nullability, or payload semantics updates
> "Current contract" below in the same PR.

## Current contract

- **Current App Store build (`CFBundleVersion`):** **764** — LIVE since 2026-09-24 (the
  first LIVE build; archived from `3760372c`). Build 587 was rejected and never LIVE.
- **Minimum supported build (`app_config.minimum_supported_build`):** **1** — the gate is **not armed**. Build 764 is the only App Store build, so arming it now would only block older TestFlight builds; raise it when a destructive change needs it.
- **Gateable floor:** build 321 (`c6a66bc`). Any build ≥ 321 contains the forced-update gate; build 764 **is gateable**. The flow for a breaking change is: ship the new build → confirm the listing is public → **only then** arm the gate by raising `app_config.minimum_supported_build` to that build → after it's live and blocking, destructive backend changes may ship.
- **Backend contract facts** (as of the current schema, `web/supabase/migrations/`):
  - `teams` no longer carries `pending_home_colors` (dropped by
    `20260824102000_drop_pending_home_colors.sql` — the migration implicated in the
    2026-08-24 TestFlight failure).
  - Team colors: `brand_colors` (ESPN-owned, ingest-overwritten) + `uniforms`
    (curated, append-only archive). Jersey palettes come only from `uniforms`.
  - `games.game_type` carries `PRE` rows (ESPN-ingested preseason, ids
    `<season>_PRE_<espnEventId>`, week 0 = Hall of Fame game) alongside nflverse's
    `REG`/`WC`/`DIV`/`CON`/`SB`. Additive, no schema change: build 764's
    `ScheduleMapper` keeps only `REG` rows and is its only `games` reader, so it never
    sees them; newer builds render them under PRESEASON. Any future client reader of
    `games` must filter by an explicit `game_type` allowlist, never "not REG".
  - `player_stats` (the legacy table — still the one build 764 reads via
    `SupabaseDepthRepository.swift`, `.from("player_stats")`) gained 24 nullable columns in
    `20260911120000_add_player_stats_position_columns.sql`: defensive box-score counters
    (`def_tackle_assists`, `def_tackles_for_loss`, `def_qb_hits`, `def_pass_defended`,
    `def_fumbles_forced`, `def_tds`, `def_safeties`, `fumble_recovery_opp`,
    `fumble_recovery_tds`), return/special-teams (`punt_returns`, `punt_return_yards`,
    `kickoff_returns`, `kickoff_return_yards`, `special_teams_tds`), penalties
    (`penalties`, `penalty_yards`), kicking (`pat_made`, `pat_att`, `fg_long`), and snap
    totals/shares (`offense_snaps`, `offense_pct`, `defense_snaps`, `defense_pct`,
    `special_teams_snaps`, `special_teams_pct`). Additive only — build 764's
    explicit column SELECT simply ignores them; no IOS-COMPATIBILITY annotation needed.
  - No restored position vocabulary (`OT`/`G`) yet. Build 764 decodes both
    (`Depth/Domain/Position.swift`), so the released-build half of that precondition is
    met; older builds still in use are the only reason to arm the gate first.
  - The canonical `player_season_stats` table has **not** landed; build 764
    still reads the legacy `player_stats` table exclusively.
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
| 587 → 588+ | 2026-09-11 to 2026-09-14 | Six migrations landed since build 587 was recorded: `player_stats` gained 24 nullable columns (position-vocabulary stat lines); four migrations added/normalized nflverse source tables (`pfr`, NGS, FTN, QBR, box score) feeding the future `player_season_stats` consolidation (not yet read by any client); `uniforms` reseeded. All additive/non-destructive per `check:ios-compat` — no `IOS-COMPATIBILITY` annotations required. | No (never armed) |
| 764 | 2026-09-24 | First LIVE App Store build. `check:ios-compat --base 3760372c` over the nine migrations changed since the archive: all additive/non-destructive (uniform seeds and path backfills, `20260921000000_add_team_line_stats.sql`). | No |
<!-- add a row per release that changes the client/backend contract -->

## Release sequencing checklist

For any PR that changes the backend contract:

- [ ] Does this change affect an existing App Store build?
- [ ] Old columns/values remain readable by the current App Store build
- [ ] New values are understood by the current App Store build
- [ ] TestFlight candidate was tested as an **upgrade from** the current App Store build
- [ ] Compatible build is **LIVE in the App Store** (not approved, not TestFlight)
- [ ] Exact App Store build number (`CFBundleVersion`) recorded above
- [ ] Minimum-supported-build gate tested against an older build
- [ ] Only **now** may destructive schema/data changes be applied

TestFlight release candidates archive the Release config and read production — the binary
tested there is the one submitted, so it never points at staging. Test unreleased backend
changes with the `Depth Stage` build (separate bundle ID, staging project) instead.

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