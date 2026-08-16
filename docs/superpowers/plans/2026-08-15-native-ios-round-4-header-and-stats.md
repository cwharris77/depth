# Native iOS Round 4: Team-page header, Stats page, unit-tab restyle

> **For agentic workers:** implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Close round-4 visual/feature parity between the native iOS app and web. The native team-page header currently conflates web's two separate header rows into one (DEP-217), the app has no Stats page at all (DEP-216), and the Offense/Defense/Special unit picker uses a stock filled-capsule `Picker` instead of web's underline `TabBar` (DEP-218). All three share the same screen, so the vault spec locks them together.

**Spec:** `../obsidian/Projects/depth/specs/2026-08-15-native-ios-round-4-header-and-stats-design.md` — read it in full before starting. "Locked Decisions" is settled; do not relitigate it.

**Method note (why this plan exists):** every gap in this round was found by screenshot-diffing the native app (iOS Simulator, iPhone 17 Pro) against the live site (`npm run dev`, mobile viewport 375×812) on the same team/data. Repeat that method for anything new. The web reference for each screen is cited below per task.

**Tech Stack:** Swift 6, SwiftUI (iOS 18), Swift Testing, XCUITest, XcodeGen.

## Global Constraints

- **Literal web port, not reinterpretation.** Colors/fonts/spacings come from `components/ui/tokens.ts`, `components/ui/SegmentedControl.tsx`, `components/ui/TabBar.tsx`, `components/TeamStatsView.tsx` as cited per task — copied, not approximated.
- **Semantic Dynamic Type.** Every font uses a named SwiftUI text style (per the 2026-08-15 visual-pass spec's type scale) — never raw `.system(size:)`.
- **`xcodegen generate` after adding or removing any Swift file.** Never hand-edit `ios/Depth.xcodeproj`. CI enforces this with `git diff --exit-code`.
- **Every new/changed module carries a role-and-constraint header comment** (AGENTS.md §3). Preserve existing load-bearing comments through edits.
- **Targeted test runs only** (CLAUDE.md §5): `xcodebuild -project ios/Depth.xcodeproj -scheme Depth -destination 'platform=iOS Simulator,id=<SIM_ID>' test -only-testing:<Suite>/<Test>` scoped to the suites the diff touches. Full suite runs are not worth it on a pre-release app.
- **Screenshot verification is mandatory for anything that changes appearance** — the page switcher, unit tabs, and the entire new Stats page. Attach evidence per task.
- **Conventional Commits**, scope `ios`. This work lands on branch `ios/visual-parity-round-4` (PR #395 is open and unmerged; the handoff says round-4 work stacks here, since it edits `TeamDetailView.swift` heavily).

## Recorded decisions (spec ambiguities resolved here, not deferred)

1. **Page-switcher tab order: ROSTER, SCHEDULE, STATS.** Spec locked-decision #4 enumerates "ROSTER, STATS, SCHEDULE" but the whole method of this round is web parity and web's `TeamPageHeader.tsx` `PAGE_TABS` is `[roster, schedule, stats]`. Web's actual order wins.
2. **ScheduleView embedding:** `ScheduleView` gets `isEmbedded: Bool = false`. Verified it has no back-button-dependent affordances — its only pushed-destination chrome is `.navigationTitle("Schedule")` + `.navigationBarTitleDisplayMode(.inline)`, both suppressed when embedded so the shared nav bar keeps the team identity (full name on the accessibility label, abbrev pill in `.principal`).
3. **No native SegmentedControl-equivalent exists** — native uses only stock `.pickerStyle(.segmented)` (unit picker, AFC/NFC switcher). A new `DepthSegmentedControl` in `Support/` is justified and matches web's `SegmentedControl` (track `surfaceChip`, active segment filled with team `uiAccent`, active text `onAccent`).
4. **Stats data is cached in the snapshot cache layer** (spec Data flow: "reuse that cache layer's pattern rather than inventing a second one") — new `CachedTeamStats` SwiftData row, cache-first + background refresh, same 32-team eviction posture as `CachedTeamSnapshot`.
5. **The next-game card is not cached** — it's derived from the existing (deliberately uncached) `teamSchedule` read in `TeamStatsViewModel`, mirroring web's `getNextGame(teamId)` which reuses `getTeamSchedule`. A failed schedule read hides the card, never the page (web's `page.tsx` wraps `getNextGame` the same way).
6. **Phase-1 domain is minimal** — no `winPercent`, `streak`, `playoffSeed`, coach, ranks, or nflverse fields. Just what the mobile-visible phase-1 content renders: record, splits, PF/PA/diff, season chips, next-game card.
7. **Page-switcher row alignment: leading.** Web right-aligns its switcher beside the DepthMark; native's brand mark already lives in the nav bar so its own row reads fine leading-aligned. If the screenshot diff at Task 7 shows web reads materially different, adjust then — not before.

## PR boundaries

Single PR (this branch already carries PR #395's two commits; round-4 work extends it). Commits are atomic per task:

| Task | Commit |
| --- | --- |
| 1 | `feat(ios): add TeamStatsPage domain, DTO, and mapper` |
| 2 | `feat(ios): add cached team-stats read to the repository` |
| 3 | `feat(ios): add native Stats page (record, splits, PF/PA, season chips, next game)` |
| 4 | `feat(ios): add DepthSegmentedControl and underline DepthUnitTabBar` |
| 5 | `feat(ios): restructure team header into a ROSTER/STATS/SCHEDULE page switcher with underline unit tabs` |
| 6 | `test(ios): update and extend UI tests for the page switcher and unit tabs` |
| 7 | `fix(ios): match web's ROSTER/SCHEDULE/STATS page-tab order` + `docs(ios): check off native iOS round-4 header and stats` |

---

### Task 1: Stats domain, DTO, and mapper

**Files:**
- Create: `ios/Depth/Domain/TeamStats.swift`
- Create: `ios/Depth/Data/TeamStatsDTO.swift`
- Create: `ios/Depth/Data/TeamStatsMapper.swift`
- Create: `ios/DepthTests/TeamStatsMapperTests.swift`

**Interfaces:**
- Produces: `struct TeamStatsPage` (`team: Team`, `seasons: [TeamSeasonStats]` newest-first, `upcomingSeason: Int?`, `currentSeason: Int`), `struct TeamSeasonStats` (phase-1 fields only), `TeamStatsRowDTO`, and `enum TeamStatsMapper` with `map(team:rows:now:)` + `nflSeasonState(now:)`.
- Consumes: `Team`/`TeamColors` (existing), `TeamListRowDTO` (existing), `TeamSnapshotMapper.mapTeamListRow` (existing).

**Web reference:** `lib/roster-source.db.ts` `TEAM_STATS_SELECT` (lines 143-144), `toTeamStats` (lines 179-211), `fetchTeamStatsPage`'s season-state block (lines 622-647); `lib/utils/team/nfl-season.ts` `nflSeasonState()` (lines 18-41); `supabase/migrations/20260712160000_add_team_stats.sql` for column names.

- [x] **Step 1: Domain type** — `ios/Depth/Domain/TeamStats.swift`:

```swift
import Foundation

// Mirrors lib/roster-source.ts's TeamStatsPage / lib/types.ts's TeamStats, scoped to
// phase-1 fields only (spec locked decision #2: no coach/rank/nflverse fields yet).
struct TeamStatsPage: Equatable, Codable, Sendable {
    let team: Team
    /// Newest season first, matching web's `fetchTeamStatsPage` ordering.
    let seasons: [TeamSeasonStats]
    /// Set for all teams during the NFL off-season (web: `isOffseason ? upcomingSeason : undefined`).
    let upcomingSeason: Int?
    /// The current NFL season year; a season is completed when its year is less than this.
    let currentSeason: Int
}

struct TeamSeasonStats: Equatable, Codable, Sendable {
    let season: Int
    let overallWins: Int
    let overallLosses: Int
    let overallTies: Int
    let homeWins: Int
    let homeLosses: Int
    let roadWins: Int
    let roadLosses: Int
    let divisionWins: Int
    let divisionLosses: Int
    let conferenceWins: Int
    let conferenceLosses: Int
    let pointsFor: Int
    let pointsAgainst: Int
    let pointDifferential: Int
}
```

- [x] **Step 2: DTO** — `ios/Depth/Data/TeamStatsDTO.swift`, explicit CodingKeys (snake_case) per the DTO convention, all stat columns optional (nullable by schema):

```swift
struct TeamStatsRowDTO: Decodable {
    let season: Int
    let overallWins: Int?
    // … every column in TEAM_STATS_SELECT, optional, with CodingKeys mapping to snake_case
}
```

- [x] **Step 3: Mapper** — `ios/Depth/Data/TeamStatsMapper.swift`:
- `map(team: Team, rows: [TeamStatsRowDTO], now: Date = .now) -> TeamStatsPage`. Seasons keep web's descending order (rows come `.order("season", ascending: false)` from the repo; also sort defensively descending here). `upcomingSeason`/`currentSeason` from `nflSeasonState(now:)`.
- `mapSeason(_ row: TeamStatsRowDTO) -> TeamSeasonStats` with `?? 0` on every optional — mirrors web's `toTeamStats` doc comment: a present row always came from a complete parse, the `?? 0` guards the nullable-by-schema type only, so a nil-valued row maps to a 0-0 record rather than crashing (AGENTS.md invariant 6 / spec Testing section).
- `nflSeasonState(now: Date = .now) -> (completedSeason: Int, upcomingSeason: Int, isOffseason: Bool)` — literal Swift port of `lib/utils/team/nfl-season.ts`: month ≥ 9 (Sep–Dec) in-season; month ≥ 2 (Feb–Aug) off-season; January wraps up the prior season. `currentSeason = isOffseason ? upcomingSeason : upcomingSeason - 1`.

- [x] **Step 4: Tests** — `ios/DepthTests/TeamStatsMapperTests.swift` (Swift Testing, `@testable import Depth`):
- Full row maps all fields.
- Nil-valued row → 0-0 record (all zeroed fields), no throw.
- Rows map in descending season order regardless of input order.
- `nflSeasonState`: fixed `Date` for Aug (off-season: upcoming=year, currentSeason=year), Oct (in-season: upcoming=year+1, currentSeason=year), Jan (completed=year-1, upcoming=year).

- [x] **Step 5: Verify** — `xcodegen generate`, then `-only-testing:DepthTests/TeamStatsMapperTests`.

- [x] **Step 6 Commit.**

---

### Task 2: Cached team-stats repository read

**Files:**
- Modify: `ios/Depth/Data/DepthRepository.swift`
- Modify: `ios/Depth/Data/SupabaseDepthRepository.swift`
- Modify: `ios/Depth/Data/CachedSnapshotModels.swift`
- Modify: `ios/Depth/Data/CachedSnapshotStore.swift`
- Modify: `ios/Depth/Data/CachingDepthRepository.swift`
- Modify: `ios/DepthTests/CachingDepthRepositoryTests.swift`

**Interfaces:**
- Adds: `DepthRepository.teamStats(teamId:) async throws -> TeamStatsPage`; `CachedTeamStats` SwiftData row; `CachedSnapshotStore.teamStats/teamStatsCachedAt/saveTeamStats`; `CachingDepthRepository.teamStats` (cache-first + background refresh).
- Consumes: `TeamStatsMapper` (Task 1), `TeamStatsRowDTO` (Task 1).

**Web reference:** `lib/roster-source.db.ts` `fetchTeamStatsPage` (lines 571-648) — the three phase-1 reads are `teams` (flat select, team identity) + `team_stats` (per-team, `.order('season', { ascending: false })`). RLS already has public-read policies (`20260712160000_add_team_stats.sql` lines 34-37); native reads with the anon key exactly like the existing snapshot fetch.

- [x] **Step 1: Protocol** — add to `DepthRepository`:

```swift
/// Read-only per-team season-record page (round-4 Stats feature). Cached like the
/// snapshot, not delegated like the schedule — spec locked decision #3.
func teamStats(teamId: String) async throws -> TeamStatsPage
```

- [x] **Step 2: Supabase implementation** — `SupabaseDepthRepository.teamStats(teamId:)`:

```swift
private static let teamStatsSelect =
    "season, overall_wins, overall_losses, overall_ties, home_wins, home_losses, \
    road_wins, road_losses, division_wins, division_losses, conference_wins, \
    conference_losses, points_for, points_against, point_differential"
```

Two queries (team via existing `teamListSelect`/`TeamListRowDTO` `.single()`, stats via the new select `.eq("team_id", ...)` `.order("season", ascending: false)`), then `TeamStatsMapper.map(team:rows:)`. Same error mapping as the other methods (PostgrestError → `DepthError`, `.single()` zero rows → `.notFound`).

- [x] **Step 3: Cache model** — `CachedSnapshotModels.swift`: add `CachedTeamStats` mirroring `CachedTeamSnapshot` (`@Attribute(.unique) teamId`, `payload: Data`, `schemaVersion`, `cachedAt`), register it in `DepthCacheSchema.models`.

- [x] **Step 4: Store** — `CachedSnapshotStore.swift`: `teamStats(teamId:)`, `teamStatsCachedAt(teamId:)`, `saveTeamStats(_:teamId:cachedAt:)` mirroring the snapshot row's schema-version-check + JSON payload pattern. Add the stats rows to the 32-team eviction (fetch `CachedTeamStats` alongside `CachedTeamSnapshot`, evict oldest across the combined set).

- [x] **Step 5: CachingDepthRepository** — `teamStats(teamId:)` cache-first with `inFlightStatsFetches` dedup + background refresh (mirror `teamSnapshot` exactly), plus `teamStatsCachedAt(teamId:)`.

- [x] **Step 6: Tests** — extend `CachingDepthRepositoryTests`: `FakeDepthRepository` gains a `teamStatsResult` + call-count; tests for cache-miss fetch, cache-hit with background refresh, and failed background refresh retaining last good stats.

- [x] **Step 7: Verify** — targeted `DepthTests/CachingDepthRepositoryTests` + `DepthTests/TeamSnapshotMapperTests`.

- [x] **Step 8 Commit.**

---

### Task 3: Native Stats page

**Files:**
- Create: `ios/Depth/Features/Stats/TeamStatsViewModel.swift`
- Create: `ios/Depth/Features/Stats/TeamStatsView.swift`

**Interfaces:**
- Produces: `TeamStatsViewModel` (feature-local `@Observable`, `@MainActor` — mirrors `ScheduleViewModel`'s shape) and `TeamStatsView(teamId:repository:)` (pure presentational over the page + next game).
- Consumes: `TeamStatsPage`, `ScheduleGame`, `DepthSegmentedControl`/chips styling from `DesignTokens`, `TeamSchedule` (for the next-game derivation).

**Web reference:** `components/TeamStatsView.tsx` (mobile-visible portion): season-chips row (lines 338-397, `UPCOMING` badge lines 73-85), team name block (402-411), hero record (413-443), breakdown table HOME/ROAD · DIV/CONF · PTS FOR/PTS AGAINST · DIFF (446-517), footer ticker `"{season} SEASON · {games} GAMES PLAYED"` (519-524), degraded upcoming hero (526-534), "No stats available" (227-238), NEXT GAME card (545-578).

- [x] **Step 1: View model** — `TeamStatsViewModel`:
- `LoadState` = `.loading / .loaded / .failed(DepthError)`.
- State: `page: TeamStatsPage?`, `selectedSeason: Int?`, `nextGame: ScheduleGame?`.
- `load()`: fetch `teamStats` + `teamSchedule(season: nil)` (schedule via `try?` — a schedule failure hides the card, never the page). Default `selectedSeason` to the newest real season row, else `upcomingSeason`.
- `selectSeason(_ season: Int)`: pure selection (all seasons already in the payload — no refetch, cheaper than web).
- Computed `isViewingCurrentOrUpcomingSeason`: mirrors web's `isViewingCurrentSeason`/`isViewingUpcomingSeason` (lines 277-281) so the next-game card only renders on the current/upcoming tab.

- [x] **Step 2: View** — `TeamStatsView`: a `ScrollView` whose body (top to bottom) mirrors the web mobile column:
- Season chips row (`HorizontalScrollView`, chips = newest-first real seasons reversed back to ascending for display like web's `.reverse()`; the current-season chip gets the accent "latest" dot; the upcoming season renders as either a real chip carrying the `UPCOMING` badge or a dashed synthetic chip).
- Team name block (`Text(verbatim: "CITY NAME")` uppercase, `.caption`/`.subheadline`).
- Hero record (large `"W-L(-T)"`, e.g. `12-4`), `textPrimary`.
- Breakdown table as four rows (HOME/ROAD, DIV/CONF, PTS FOR/PTS AGAINST, DIFF) — DIFF colored `uiAccent` when positive, `DesignTokens.Colors.danger` when negative, `textMuted` at 0.
- Footer ticker `"{season} SEASON · {games} GAMES PLAYED"`.
- Degraded hero for the synthetic upcoming chip: "`{year}` season upcoming / No games played yet this season" + `"{year} SEASON · NOT YET STARTED"`.
- Empty (no seasons, no upcomingSeason): `ContentUnavailableView` "No stats available for this team yet.".
- Next-game card when `isViewingCurrentOrUpcomingSeason && nextGame != nil`: `NEXT GAME · WEEK n` + `vs/@ OPP` + formatted date (reuse the `yyyy-MM-dd` → `month(.abbreviated).day()` formatter pattern from `ScheduleView`), opponent abbrev tile.
- Failure: `ContentUnavailableView` + Retry (`stats-retry`), same pattern as the roster's failed case.
- Own `.task { await viewModel.load() }` and `.refreshable`, so it loads lazily on first visit and refreshes independently (spec Data flow).

**Accessibility identifiers:** `stats-content`, `stats-loading`, `stats-error`, `stats-retry`, `stats-season-<year>`, `stats-record`, `stats-games-played`, `stats-next-game`.

- [x] **Step 3: Verify** — `xcodegen generate`, build, then launch in the simulator and screenshot against the live web mobile stats page (Task 7 does the formal diff; a quick sanity screenshot now).

- [x] **Step 4 Commit.**

---

### Task 4: Shared header components

**Files:**
- Create: `ios/Depth/Support/DepthSegmentedControl.swift`
- Create: `ios/Depth/Support/DepthUnitTabBar.swift`

**Interfaces:**
- Produces: `DepthSegmentedControl(options:selection:onChange:activeColor:)` (web `SegmentedControl` port — filled-pill track `surfaceChip`, active segment `uiAccent` fill + `onAccent` text + `40`-alpha onAccent border, inactive `textMuted`) and `DepthUnitTabBar(selection:onChange:activeColor:)` (web `TabBar` port — 2px bottom border in `activeColor` when active, bold `textPrimary`; inactive `textFaint`, no border; labels uppercase).

**Web reference:** `components/ui/SegmentedControl.tsx` (track `surfaceChip`, `rounded-lg p-0.5`, gap-0.5; item `rounded-md px-2 py-1`, bold, `typeScale.body`), `components/ui/TabBar.tsx` (`pb-2.5`, `2px solid` bottom border, `gap-4`, `font-bold`, uppercase caller).

- [x] **Step 1: `DepthSegmentedControl`** — hugging-content `HStack`, each option a `Button` with `.frame(minHeight: 44)` (tap target; spec Testing). `activeColor`/`onAccent` passed in. `onAccent` derived from the passed color's team — simplest: caller passes both `activeColor: Color` and lets the view use `DesignTokens.Colors.onAccent` for active text (matches `tokens.ts` `onAccent` when the active color is a team `uiAccent`; on the roster the team's own `onAccent` matches web's `activeTextColor`).

- [x] **Step 2: `DepthUnitTabBar`** — `HStack(spacing: 16)` of `Button`s, each `.frame(minHeight: 44)` (spec Testing: 44pt hit area preserved via `.frame(minWidth:minHeight:)`), `.overlay(alignment: .bottom)` 2pt border. Caller passes the unit labels; labels uppercase in the caller (web upper-cases in `FieldHeaderMenu`).

- [x] **Step 3: Verify** — build only; both are consumed by Task 5, so no standalone screenshot yet.

- [x] **Step 4 Commit.**

---

### Task 5: TeamDetailView restructure + ScheduleView embed

**Files:**
- Modify: `ios/Depth/Features/TeamDetail/TeamDetailView.swift` (heavy)
- Modify: `ios/Depth/Features/Schedule/ScheduleView.swift`

**Interfaces:**
- `TeamDetailView`: new `@State private var page: TeamPage = .roster` with `private enum TeamPage: String, CaseIterable { case roster, stats, schedule }`; `body` wraps `pageSwitcherRow` + a `@ViewBuilder pageContent` switch in a `VStack(spacing: 0)`; the calendar `NavigationLink` ToolbarItem is removed (the `•••` Menu is untouched); the unit `Picker(...).pickerStyle(.segmented)` is replaced with `DepthUnitTabBar`.
- `ScheduleView`: `init(teamId:repository:isEmbedded: Bool = false)` — suppresses `.navigationTitle`/`.navigationBarTitleDisplayMode` when embedded.

**Web reference:** `components/TeamPageHeader.tsx` (page switcher row, lines 113-128), `components/FieldHeaderMenu.tsx` (underline unit tabs + bottom border, lines 36-46).

- [x] **Step 1: `ScheduleView` embed flag** — add `let isEmbedded: Bool`; apply `.navigationTitle("Schedule")`/`.navigationBarTitleDisplayMode(.inline)` only when `!isEmbedded`. Update the one existing caller's comment (TeamDetailView's toolbar link is deleted in Step 2, so the pushed caller disappears — keep the param for any future pushed use and for the app-store-screenshot tooling that drives ScheduleView through this same entry).

- [x] **Step 2: `TeamPage` + page content switch** — in `TeamDetailView`:

```swift
@State private var page: TeamPage = .roster

private enum TeamPage: String, CaseIterable {
    case roster, stats, schedule
    var label: String { rawValue.uppercased() }
}
```

`content` becomes a `VStack(spacing: 0)` of `pageSwitcherRow` + `@ViewBuilder pageContent`, where:
- `.roster` → existing `historyViewModel.isHistorical ? historicalContent : currentContent`
- `.stats` → `TeamStatsView(teamId: viewModel.teamId, repository: repository)`
- `.schedule` → `ScheduleView(teamId: viewModel.teamId, repository: repository, isEmbedded: true)`

`pageSwitcherRow` is a `DepthSegmentedControl` with options ROSTER/SCHEDULE/STATS (order per Recorded decision #1), `activeColor` = `(fieldColors ?? displayedSnapshot?.team.colors ?? team)`.uiAccent, horizontal padding, `.accessibilityIdentifier("page-switcher")` with per-option `page-switcher-roster` etc.

- [x] **Step 3: Remove the calendar toolbar button** — delete the `NavigationLink { ScheduleView(...) }` ToolbarItem and its comment block; keep the `Menu` exactly as-is. Extend the header comment to note Schedule is now the third page-switcher tab (DEP-217).

- [x] **Step 4: Underline unit tabs** — replace the `Picker("Unit", ...).pickerStyle(.segmented).padding(.horizontal)` in `rosterContent` with:

```swift
DepthUnitTabBar(
    selection: unit,
    onChange: { unit = $0 },
    activeColor: Color(hex: (fieldColors ?? displayedSnapshot?.team.colors).uiAccent)
)
.padding(.horizontal)
.overlay(alignment: .bottom) { Rectangle().fill(DesignTokens.Colors.borderDefault).frame(height: 1) }
```

Keep the `@State unit`/`UserPreferences.lastUnit` persistence and the `.onChange(of: unit)` exactly as-is. Do not add selection-state dot styling to the field (out of scope, same as Task 2 of the visual-pass plan).

- [x] **Step 5: Verify** — `xcodegen generate`, build, targeted UI tests (`DepthUITests/DepthUITests`). Expect `testOpenTeamSchedule` and the two `segmentedControls` references to fail — that's the expected state until Task 6 updates them.

- [x] **Step 6 Commit.**

---

### Task 6: UI-test updates + new coverage

**Files:**
- Modify: `ios/DepthUITests/DepthUITests.swift`
- Modify: `ios/DepthUITests/AccessibilityUITests.swift`
- Modify: `ios/DepthUITests/AppStoreScreenshotsUITests.swift`

- [x] **Step 1: Update the removed `schedule-destination` reference** — `testOpenTeamSchedule` taps `page-switcher-schedule` instead, then asserts `schedule-content` + a week card (embedded schedule, no back button to check).

- [x] **Step 2: Update the `segmentedControls` references** — `DepthUITests.testLaunchesIntoAChartThenSwitchesTeamAndOpensPlayerDetail`, `AccessibilityUITests.testCriticalPathRemainsUsableAtAccessibilityXXXL`, and `AppStoreScreenshotsUITests` all `app.segmentedControls.firstMatch` the unit picker. Replace with a `unit-tab-offense` button existence check (the underline tab bar is now the unit switcher).

- [x] **Step 3: New `testPageSwitcherReachesAllThreePages`** — launch, `page-switcher-stats` → assert `stats-content` (record renders for a known team, e.g. Bills), `page-switcher-schedule` → assert `schedule-content`, `page-switcher-roster` → assert the chart renders again (roster back).

- [x] **Step 4: New `testUnitTabsPreserveTapTargets`** — assert `unit-tab-offense`/`unit-tab-defense`/`unit-tab-special` exist, are hittable, and `frame.height >= 44` (spec Testing: the underline style has less chrome than the capsule; confirm the hit area via `.frame(minWidth:minHeight:)`).

- [x] **Step 5: Verify** — targeted runs:
```bash
xcodebuild ... -only-testing:DepthUITests/DepthUITests test
xcodebuild ... -only-testing:DepthUITests/AccessibilityUITests test
```
(`AppStoreScreenshotsUITests` is scheme-skipped; verify it still compiles via a build.)

- [x] **Step 6 Commit.**

---

### Task 7: Screenshot verification against web

Boot the app on the iPhone 17 Pro simulator, screenshot the roster page (page switcher + underline unit tabs), the Stats page (record/splits/chips/next-game), and the Schedule page. Run `npm run dev`, load the same team's `/team/[id]`, `/team/[id]/stats`, `/team/[id]/schedule` at the 375×812 mobile viewport, and diff side-by-side (same method that found this round's gaps). Fix any mismatch the diff reveals, re-verify, then attach the before/after to the report.

- [x] **Step 1:** screenshot all three native pages.
- [x] **Step 2:** screenshot web mobile at 375×812 for the same team.
- [x] **Step 3:** diff, fix, re-verify.
- [x] **Step 4: Commit** any fix as its own `fix(ios): ...` commit.

---

### Task 8: Documentation and ledger

**Files:**
- Modify: `docs/superpowers/plans/2026-08-15-native-ios-round-4-header-and-stats.md` (this file)
- Modify: `../obsidian/Projects/depth/specs/2026-08-15-native-ios-round-4-header-and-stats-design.md` (Status line + Implementation plan path)

Check off completed tasks, update the spec's Status line to shipped + date, point the spec's "Implementation plan" line at this file, and close DEP-216/217/218 with resolution notes. Commit `docs(ios): check off native iOS round-4 header and stats`.

---

## Deferred, on purpose

Named in the spec's "Out of scope". Do not fold into this round.

- Coaching staff, league rank badges, nflverse season-stat leaders — phase-2 Stats (DEP-216 ticket).
- Uniform picker visual rendition — DEP-220, needs a decision on art delivery (SVG vs. pre-rendered exports).
- Edit Depth Chart's forced-sign-in / local-first — DEP-219, needs its own local-persistence spec.
- Real per-team formations data — DEP-221, pure data-layer work (independent of this round's UI).
- Team switcher pill "still ugly" — DEP-222, blocked on Cooper's specific direction.