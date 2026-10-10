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
- **Minimum supported build (`app_config.minimum_supported_build`):** **764** — armed 2026-09-24, so every build older than the live App Store build gets the update screen.
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
  - `roster_history.position` may carry generic `OT`/`G` for offensive linemen with no
    sided depth-chart row (mostly pre-2001 seasons). Build 764 decodes both
    (`Depth/Domain/Position.swift`); older builds are blocked by the gate at 764.
  - `roster_history.position` may carry generic `DB` for defensive backs the source does
    not split into corner or safety (mostly pre-2001 seasons). Build 764 does not decode
    `DB`; `HistoricalRosterMapper` drops and logs those rows, so those players are omitted
    from that build's historical view, never mislabeled. Builds that decode `DB` seat them
    in empty corner and safety slots.
  - `app_events.event_name` accepts `notification_opened` in addition to the six names
    build 764 sends (`app_launch`, `depth_chart_reached`, `auth_started`,
    `auth_completed`, `override_saved`, `error`), widened by
    `20261011120000_allow_notification_opened_event.sql`. The table is insert-only for
    clients and no build reads it, so the wider list changes nothing build 764 decodes
    or writes. The check constraint is dropped and re-added in one migration, which is
    why that migration carries an annotation.
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
| 764 | 2026-09-24 | Gate armed at 764. The rosters ingest stops omitting and deleting generic `OT`/`G` rows, so historical seasons publish those values again. | Yes (764) |
| 764 | 2026-09-27 | 1999–2025 `roster_history` re-ingested with the canonical position mapping: nflverse `FB`/`NT`/`FS`/`SS` preserved, `SAF` → `S`, generic defensive backs stored as `DB`. No schema change. Build 764 drops and logs the `DB` rows, so those players are missing from its historical view until a build that decodes `DB` is live and gated. | Yes (764) |
| 764 | 2026-10-10 | 2001–2025 `roster_history` re-ingested with the per-unit nflverse depth-chart mapping: club spellings of a sided slot resolve to it (`LOT` → `LT`, `LE` → `LDE`, `WILL` → `WLB`, `NCB` → `NB`), a defensive tackle charted as `LT`/`RT` is stored as `DT` rather than an offensive tackle, and a special-teams listing no longer overwrites a field position. No schema change, no rows added or removed, and every written value is one build 764 already decodes. | Yes (764) |
| 764 | 2026-10-10 | `app_events.event_name` check widened to also allow `notification_opened` (`20261011120000_allow_notification_opened_event.sql`). Expand-only: all six names build 764 inserts stay allowed, and no client reads the table. Grants, RLS and columns unchanged. | Yes (764) |
| 764 | 2026-10-10 | 2012–2025 `roster_history` re-ingested with nickel-back depth-chart codes (`NB`, `NCB`, `NICK`, `NICKE`, `NKL`) read as a role rather than a position: a player charted at nickel keeps his other charted position or his roster position (`CB`, `FS`, `SS`, `DB`) instead of being stored as `NB`. About 230 player-seasons change. No schema change; `DB` rows were already hidden on build 764, and this can add at most two more. | Yes (764) |
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