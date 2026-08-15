# Task 8C — Native Historical Rosters Report

## Implementation

Added the native, read-only team-history flow for seasons 1999 through the current roster season.

- `HistoryViewModel` has separate current/loading/loaded/empty/failed states, a date-injectable
  January rollover helper, and monotonically increasing request IDs. A season tap synchronously
  clears live/override content before the history request begins; stale successes and failures
  cannot replace a newer season or Today.
- The History toolbar destination presents the current `<year> · Roster` first, then prior years
  descending to 1999. Historical content shows `<year> season`, Retry/Back-to-today recovery, and
  has no edit-order control or applied live override. Pull-to-refresh retries the active selected
  historical season rather than loading the live snapshot or override state.
- `roster_history` is queried with an explicit projection, exact team/season filters, and stable
  position/player-order sorting. The mapper validates position/rank, preserves source order and
  stored profile fields, derives canonical special teams, and returns typed `DepthError.decoding`
  failures for bad position/rank data.
- Historical profile IDs use `gsis:<gsis_id>@<season>`. Stats first resolve the exact historical
  GSIS/season row's `espn_id`; absent mappings return no stats, malformed synthetic IDs do not
  query, and current player IDs retain the previous regular-season, newest-first path.
- The cache decorator delegates history reads directly so independently opened immutable seasons
  never enter the current roster snapshot cache.

## Files

- `ios/Depth/Data/HistoricalRosterDTO.swift`
- `ios/Depth/Data/HistoricalRosterMapper.swift`
- `ios/Depth/Data/DepthRepository.swift`
- `ios/Depth/Data/SupabaseDepthRepository.swift`
- `ios/Depth/Data/CachingDepthRepository.swift`
- `ios/Depth/Features/History/HistoryViewModel.swift`
- `ios/Depth/Features/History/HistorySeasonSheet.swift`
- `ios/Depth/Features/TeamDetail/TeamDetailView.swift`
- `ios/DepthTests/HistoryFeatureTests.swift`
- `ios/DepthTests/CachingDepthRepositoryTests.swift`
- `ios/DepthUITests/DepthUITests.swift`
- `ios/Depth.xcodeproj/project.pbxproj` (regenerated with `xcodegen generate`)

## TDD evidence

### RED — data/state contract

After adding the focused history tests and regenerating the Xcode project, the focused test command
failed at compilation as intended before production code existed. `HistoryFeatureTests.swift`
reported missing `HistoricalRosterRowDTO`, `HistoricalRosterMapper`, `HistorySeason`,
`HistoryViewModel`, and historical stats-resolution symbols.

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' \
  -only-testing:DepthTests/HistoryFeatureTests test
```

The added tests cover January/February/September season selection; picker range/order; DTO mapping,
fallback values, identity, player order/status/bio, malformed position/rank, canonical K/P/LS plus
empty KR/PR, historical reference parsing, stats routing, cache delegation, history
success/not-found/failure/retry/Today, immediate live-content invalidation, and generation-specific
out-of-order requests. The delayed fake keys requests by `(season, request count)`, including the
second 2013 request used by the Today invalidation assertion, so the test cannot pass or hang by
reusing an earlier request continuation.

### GREEN — focused data/state suite

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' \
  -only-testing:DepthTests test
```

Final focused output: `Test run with 82 tests in 0 suites passed after 1.128 seconds.`

### RED/GREEN — live history journey

The strengthened XCUITest initially failed before the History destination existed (no
`history-destination` match). After the native destination was implemented, the test also exposed
two real UI issues during development: the virtualized season list needed scrolling to reach 2013,
and a formatted numeric `Text` made the accessibility label `2,013 season`. The final test scrolls
to the deterministic 2013 row and the state uses verbatim text to expose exactly `2013 season`.

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' \
  -only-testing:DepthUITests/DepthUITests/testOpenHistoricalRosterProfileAndReturnToToday test
```

Final focused journey passed with one test and zero failures. It uses Staging data to search
Seahawks, select 2013, assert the exact season label, verify editing is absent, open the historical
QB profile, and return to Today.

## Rights fallback

This intentionally diverges from the web image field: the historical DTO projection excludes
`headshot_url`, and historical players always have `photoUrl = nil`, so the existing jersey-number
fallback is used. Historical snapshots use `uniforms = []`; the feature adds no team-logo,
uniform, headshot, or other remote sports imagery. Team colors remain available through the existing
team model.

## Full verification

Required command:

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test
```

Result: exit code `0`, `** TEST SUCCEEDED **`. The final run passed `82` Swift Testing cases in
`1.093` seconds and all `5` XCUITest journeys in `67.435` seconds (overall test operation
`79.041` seconds), including the new live historical journey.

## Self-review and concerns

No blocking findings.

- Current roster loading, schedule navigation, auth/edit behavior, unit selection, and snapshot
  cache semantics remain on their existing paths. Historical refresh calls only history retry; it
  cannot reload live snapshot/overrides while a past season is active.
- No schema, web, dependency, cache-migration, uniform, sharing, settings, analytics, or public
  live-link changes were made.
- `xcodegen generate` refreshed all new source membership. `git diff --check` passes.
- The simulator emitted pre-existing LLDB debugger-version and duplicate
  `UIAccessibilityLoaderWebShared` environment warnings. They did not produce test failures.
