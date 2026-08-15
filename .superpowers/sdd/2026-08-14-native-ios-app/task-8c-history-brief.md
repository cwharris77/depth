# Task 8C — Native historical rosters

## Outcome

Add the read-only native “team through time” view for seasons 1999–present, backed directly by the existing public `roster_history` data and matching the shipped web D1 behavior.

## Requirements

- Follow T8 in `docs/superpowers/plans/2026-08-14-native-ios-app.md`, Milestone 2B and QA requirements in the native design/QA specs, and the locked D1 decisions in `../obsidian/Projects/depth/specs/2026-07-07-phase-d-history-and-boards-design.md`.
- Use the existing web behavior/data contract as the oracle:
  - `components/SeasonSheet.tsx`
  - `lib/hooks/schedule/use-team-season.ts`
  - `components/DepthChartField.tsx` / `DepthChartFieldSurface.tsx`
  - `lib/roster-source.db.ts` (`toHistoricalPlayer`, `historicalSpecialTeams`, `getTeamSeason`, historical stats ID resolution)
  - `lib/utils/team/nfl-season.ts`
- Add immutable historical-roster domain/DTO mapping and a minimal `DepthRepository` read using explicit `roster_history` columns. Filter exact team + season, order deterministically by position/player order, and reject malformed positions/ranks as typed decoding failures. No schema, Function, or web API changes.
- Historical player contract must match the web oracle:
  - synthetic id `gsis:<gsis_id>@<season>`;
  - stored number or `0`, stored college/height/weight, `age = 0`, `experience = 0`;
  - rank 1 → starter, ranks 2/3 → backup;
  - bio context `<season> · <city> <team name>`;
  - preserve full `player_order` in `Player.order` while `depthRank` remains 1...3.
- Rights fallback: do not surface `headshot_url`, team logos, uniforms, or any new remote sports imagery in this feature. Historical players use the existing number fallback. Record this intentional divergence from the web image field in the report.
- Derive historical special teams from the historical roster using the canonical web layout: K/P/LS select that position’s rank-1 player; KR/PR are always unfilled—never guess.
- Extend `DepthRepository`, `SupabaseDepthRepository`, and `CachingDepthRepository` minimally. History is an independent on-demand read delegated by the cache decorator; do not add it to the current snapshot cache.
- Extend `playerStats(playerId:)` so historical ids resolve through the exact `roster_history` row’s `espn_id` before querying `player_stats`; no mapping returns an empty stats result, malformed synthetic ids never trigger a guessed query, and current ESPN ids keep the existing path. Keep REG/newest-first behavior.
- Mirror web season semantics with a pure, date-injectable current-roster-season helper: January uses the prior calendar year; February–December use the current calendar year. The picker presents `<current> · Roster`, then past seasons descending through 1999.
- Add a standard SwiftUI history toolbar button and season sheet on team detail. Selecting a past season:
  - immediately leaves live/override content so no stale live-roster flash occurs;
  - shows an intentional loading state, then the historical field or a distinct no-data state;
  - shows `<year> season` with a 44×44 “Back to today” action;
  - remains read-only: hide edit-order actions and never apply/load live depth overrides into the historical snapshot;
  - preserves team colors only; no uniform selector or uniform rendering;
  - allows player profiles to open normally with the season-context bio and resolved/empty stats.
- A failed historical read retains the selected season, shows typed recovery copy plus Retry and Back to today. Retry must target that season. Selecting another season or returning today invalidates older requests so a slow response cannot overwrite the active view. Clear a selected player whenever season changes.
- Preserve current roster behavior, schedule navigation, auth/edit behavior, unit selection, cache semantics, and the complete-profile PR unchanged outside the small integration seams.
- Accessibility: semantic season/checkmark labels, deterministic VoiceOver order, Dynamic Type through Accessibility XXXL, and at least 44×44 History/season/Retry/Back controls.
- Use TDD. Before production changes, observe focused failures covering:
  - date-bound current-season logic;
  - DTO mapping, synthetic id, player order/status/bio, missing values, malformed position/rank;
  - K/P/LS resolution and explicitly empty KR/PR;
  - success/not-found/failure/retry/back-to-today/stale-response history states;
  - historical player-reference parsing and stats-resolution behavior;
  - cache decorator delegation.
- Strengthen the live XCUITest to select a known production-shaped historical season (2013), assert the season state and a historical field player, confirm editing is absent, open a historical profile, and return to today. Do not weaken existing journeys.
- Add no dependencies, caching migration, schedule changes, sharing, settings, analytics, uniforms, public live links, or unrelated refactors.
- Regenerate the Xcode project with `xcodegen generate` when source membership changes.
- Before commit: self-review, `git diff --check`, and the exact full live Staging simulator suite on the booted iPhone 17 Pro.

## Verification command

`xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`
