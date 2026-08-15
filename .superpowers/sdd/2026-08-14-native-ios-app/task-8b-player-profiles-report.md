# Task 8B — Complete player profiles report

## Scope delivered

- Completed the immutable native `Player` profile projection: status, age, college,
  experience, height, weight, bio, and photo URL are explicitly mapped from `PlayerDTO`.
  Existing position, jersey-number, and depth-rank validation remains unchanged.
- Added immutable regular-season `PlayerSeasonStats`, explicit DTO mapping, complete
  position-specific web-equivalent column vocabulary/formatting, and no-games filtering.
- Added the independent `DepthRepository.playerStats(playerId:)` seam. The Supabase
  implementation selects explicit `player_stats` columns, filters `REG`, orders newest
  season first, and embeds only `teams(abbrev)`; no team/player sports-mark imagery was
  introduced. `CachingDepthRepository` delegates without changing snapshot caching.
- Replaced T6's basic player sheet with the complete standard SwiftUI profile: identity,
  granular/full position, status, vitals, conditional college/bio, horizontally scrollable
  Dynamic-Type-safe stats table, loading reservation, resolved empty, typed failure/retry,
  and retained profile content on stats failure. Sheet identity plus request IDs prevent
  stale/dismissed player responses from overwriting the active profile.
- Strengthened the live player journey to assert profile content, not merely its Close
  action.

## Files changed

### Production

- `ios/Depth/Domain/Player.swift`
- `ios/Depth/Domain/PlayerSeasonStats.swift` (new)
- `ios/Depth/Domain/Position.swift`
- `ios/Depth/Data/DepthRepository.swift`
- `ios/Depth/Data/SupabaseDepthRepository.swift`
- `ios/Depth/Data/CachingDepthRepository.swift`
- `ios/Depth/Data/TeamSnapshotDTO.swift`
- `ios/Depth/Data/TeamSnapshotMapper.swift`
- `ios/Depth/Features/TeamDetail/PlayerProfileViewModel.swift` (new)
- `ios/Depth/Features/TeamDetail/PlayerDetailView.swift`
- `ios/Depth/Features/TeamDetail/TeamDetailView.swift`
- `ios/Depth.xcodeproj/project.pbxproj` (regenerated with `xcodegen generate`)

### Tests

- `ios/DepthTests/PlayerProfileTests.swift` (new)
- `ios/DepthTests/CachingDepthRepositoryTests.swift`
- `ios/DepthTests/ScheduleFeatureTests.swift`
- `ios/DepthUITests/DepthUITests.swift`

## TDD evidence

### RED

1. `playerMapperPreservesCompleteProfileFields` was run before mapping changes and
   recorded seven expected failures: status, age, college, experience, height, weight,
   and bio were absent from the native `Player` domain mapping.
2. The stats/display/view-model contract was added before its production layer. Its
   focused compilation failed because `PlayerSeasonStats`, stats DTOs, stat columns,
   display formatters, and `PlayerProfileViewModel` did not yet exist.
3. The strengthened live profile XCUITest failed before UI changes with:
   `player detail should expose a scrollable complete profile`.

### GREEN

1. The mapping-focused unit target passed after explicit `Player` mapping.
2. The profile unit target passed after the stats model, mapper, repository seam,
   formatting, and state machine landed: **68 passed, 0 failed**.
3. The strengthened live player journey passed after the complete profile UI landed:
   **1 passed, 0 failed**.

## Final verification

Commands run:

```sh
xcodegen generate # from ios/
npm run format
git diff --check
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test
```

Final exact Staging simulator result (iPhone 17 Pro `736575DC-2DBD-4F28-85FC-D00C9E75D6F9`):

- **72 passed, 0 failed, 0 skipped**
- Result bundle:
  `~/Library/Developer/Xcode/DerivedData/Depth-esuhnwdecudhsigsnbiwlbrglpai/Logs/Test/Test-Depth-2026.08.14_23-31-26--0700.xcresult`

`npm run format` completed without changing non-task files; `git diff --check` was clean.

## Verification concern resolved

The first exact full-suite attempt completed with **71 passed / 1 failed**: the external
XCTest runner was killed during `DepthUITests.testOpenTeamSchedule()` (`signal kill`),
with no application assertion failure. Earlier runs also left incomplete result bundles
because the command's ~465 kB verbose output exceeded the execution stream cap before
Xcode finalized results. I preserved this evidence in the task log, cleared only
Depth-specific DerivedData, restarted only the specified booted simulator, and reran the
same exact command with stdout/stderr redirected to a temporary log. The final two exact
runs both completed successfully at 72/72.

No unresolved product or code concerns remain in Task 8B scope. Physical-device
VoiceOver/Accessibility XXXL validation remains the plan's human-only release gate; the
implementation uses semantic labels, 44×44 Close/Retry controls, and a horizontally
scrollable stats table for large Dynamic Type.

## Follow-up — missing-college sentinel regression

Independent review found that ESPN ingestion persists `—` as the missing-college
sentinel. The initial `PlayerProfileDisplay.meaningful` implementation trimmed whitespace
but treated that sentinel as real content, which would render `College —`.

- **RED:** added an em-dash regression expectation (with surrounding whitespace); the
  focused `DepthTests` target failed in
  `profileDisplayUsesHumanLabelsAndMissingValueFallbacks` before the fix.
- **GREEN:** `meaningful` now trims first and returns `nil` for either empty text or the
  exact em-dash sentinel. Focused `DepthTests`: **68 passed, 0 failed**.
- **Final exact Staging suite:** **72 passed, 0 failed, 0 skipped** on iPhone 17 Pro
  `736575DC-2DBD-4F28-85FC-D00C9E75D6F9` (result bundle
  `Test-Depth-2026.08.14_23-38-13--0700.xcresult`).
