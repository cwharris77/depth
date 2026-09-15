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

- **Current App Store build (`CFBundleVersion`):** **587** — **rejected** under Guideline 2.1(a)
  (cross-device OTP cooldown, see [[Tickets/App Store resubmission after rejection|DEP-565]]),
  never LIVE. A rejected binary cannot be resubmitted; the next archive (§G of DEP-565) will be
  build **588 or higher**, auto-derived from git commit count at archive time — not yet cut, so
  the exact number isn't known until that step runs.
- **Minimum supported build (`app_config.minimum_supported_build`):** **1** — the gate is **not armed** (no build has ever been LIVE; arming before the listing is public would lock out the only channel with installs — see `Reference/forced-update-gate.md`, "Do not arm before the listing is public")
- **Gateable floor:** build 321 (T5, #355 — `c6a66bc`). Any build ≥ 321 contains the forced-update gate; the resubmission build (588+) **is gateable**. Once it's LIVE, the flow is: ship the new build → confirm the listing is public → **only then** arm the gate by raising `app_config.minimum_supported_build` to that build → after it's live and blocking, destructive backend changes may ship.
- **Backend contract facts** (as of the current schema, `web/supabase/migrations/`):
  - `teams` no longer carries `pending_home_colors` (dropped by
    `20260824102000_drop_pending_home_colors.sql` — the migration implicated in the
    2026-08-24 TestFlight failure).
  - Team colors: `brand_colors` (ESPN-owned, ingest-overwritten) + `uniforms`
    (curated, append-only archive). Jersey palettes come only from `uniforms`.
  - `games.game_type` carries `PRE` rows (ESPN-ingested preseason, ids
    `<season>_PRE_<espnEventId>`, week 0 = Hall of Fame game) alongside nflverse's
    `REG`/`WC`/`DIV`/`CON`/`SB`. Additive, no schema change: the resubmission build's
    `ScheduleMapper` keeps only `REG` rows and is its only `games` reader, so it never
    sees them; newer builds render them under PRESEASON. Any future client reader of
    `games` must filter by an explicit `game_type` allowlist, never "not REG".
  - `player_stats` (the legacy table — still the one the resubmission build reads via
    `SupabaseDepthRepository.swift`, `.from("player_stats")`) gained 24 nullable columns in
    `20260911120000_add_player_stats_position_columns.sql`: defensive box-score counters
    (`def_tackle_assists`, `def_tackles_for_loss`, `def_qb_hits`, `def_pass_defended`,
    `def_fumbles_forced`, `def_tds`, `def_safeties`, `fumble_recovery_opp`,
    `fumble_recovery_tds`), return/special-teams (`punt_returns`, `punt_return_yards`,
    `kickoff_returns`, `kickoff_return_yards`, `special_teams_tds`), penalties
    (`penalties`, `penalty_yards`), kicking (`pat_made`, `pat_att`, `fg_long`), and snap
    totals/shares (`offense_snaps`, `offense_pct`, `defense_snaps`, `defense_pct`,
    `special_teams_snaps`, `special_teams_pct`). Additive only — the resubmission build's
    explicit column SELECT simply ignores them; no IOS-COMPATIBILITY annotation needed.
  - No restored position vocabulary in this cycle — DEP-486 (`OT`/`G` restoration) is still
    Backlog, blocked on a released build that decodes those values plus an armed gate.
  - The canonical `player_season_stats` table (DEP-544/542) has **not** landed; the
    resubmission build still reads the legacy `player_stats` table exclusively — see
    "Retirement order" below.
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
| 587 → 588+ | 2026-09-11 to 2026-09-14 | Six migrations landed since build 587 was recorded: `player_stats` gained 24 nullable columns (position-vocabulary stat lines, DEP-538); four migrations added/normalized nflverse source tables (`pfr`, NGS, FTN, QBR, box score) feeding the future `player_season_stats` consolidation (not yet read by any client); `uniforms` reseeded. All additive/non-destructive per `check:ios-compat` — no `IOS-COMPATIBILITY` annotations required. | No (never armed) |
<!-- add a row per release that changes the client/backend contract -->

**Retirement order for the backwards-compat scaffolding** (decided with Cooper, 2026-09-15):
the resubmission build (588+) reads only the legacy `player_stats` table — confirmed via
`Depth/Data/SupabaseDepthRepository.swift`'s `.from("player_stats")` calls; no code path reads
`player_season_stats` yet. The dependency chain is already fixed by each ticket's `blocked-by`
and does not need reordering: DEP-544 (consolidate into canonical `player_season_stats`, legacy
table stays populated) → DEP-542 (iOS switches its reader to `player_season_stats`) → DEP-545
(drop legacy `player_stats`, requires the DEP-542 build LIVE + gate armed at or above it).
DEP-486 (restore `OT`/`G`) is independent of that chain — also blocked on a released build that
decodes the values plus an armed gate — and can proceed in parallel once its own precondition is
met. None of the four are unblocked today: no build has ever been LIVE, so the gate has nothing
to arm against yet. This resubmission (588+) does not change that — it is expected to be the
*first* LIVE build, so the earliest any of DEP-544/542/545/486 can proceed is after 588+ is
confirmed LIVE (§H of DEP-565).

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