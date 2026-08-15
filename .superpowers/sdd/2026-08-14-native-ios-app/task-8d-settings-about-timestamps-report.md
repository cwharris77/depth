# Task 8D — Settings, About, and data timestamps Report

## Implementation

Expanded the existing native `SettingsView` (no parallel settings screen) with two new sections,
and exposed the on-device cache timestamp the app already tracks in two places.

- **About section**: display name, version/build from bundle metadata via a pure
  `formattedVersionAndBuild(version:build:)` formatter (graceful `—` fallback when a value is
  missing or empty), and the required non-affiliation/fair-use disclaimer verbatim.
- **Data section**: reports the team-list cache timestamp as "Saved on this device <relative
  time>", or "Not saved yet" when nothing has been cached, plus secondary copy that explicitly
  disclaims it as an ingestion/source-freshness signal. `DataTimestamp.savedOnDeviceLabel`
  takes an explicit `now`/`locale`/`timeZone` (never a live clock/`Locale.current` internally) so
  callers get a deterministic string.
- `TeamListViewModel` now captures `cachedAt` from `CachingDepthRepository.teamListCachedAt()`
  immediately after a *successful* `teams()` load only — a failed load leaves it `nil` rather than
  reporting a stale/guessed timestamp as current. `TeamListView` threads this straight into
  `AccountSettingsButton` → `SettingsView`, so Settings never performs its own extra fetch.
- `TeamDetailView` now renders an explicit "Saved on this device" banner using the existing
  `TeamDetailViewModel.cachedAt` in **both** fresh and stale states; the pre-existing `StaleBanner`
  is unchanged and still only appears past the 24-hour threshold, now stacked below the new label.
  Historical rosters have no cache row and are unaffected (`!historical` guard, same as
  `StaleBanner`).
- No privacy/support links, email addresses, domains, App Store URLs, uniforms, sharing,
  telemetry, third-party SDKs, or schema changes were added — the brief explicitly forbids
  guessing those until a real production support contact/domain exists (T1/Gate 0 is still open).

## Files

- `ios/Depth/Support/AppBuildInfo.swift` (new)
- `ios/Depth/Support/DataTimestampFormatting.swift` (new)
- `ios/Depth/Features/Settings/SettingsView.swift`
- `ios/Depth/Features/Teams/TeamListViewModel.swift`
- `ios/Depth/Features/Teams/TeamListView.swift`
- `ios/Depth/Features/TeamDetail/TeamDetailView.swift`
- `ios/DepthTests/SettingsAboutAndTimestampTests.swift` (new)
- `ios/DepthUITests/AuthUITests.swift`
- `ios/Depth.xcodeproj/project.pbxproj` (regenerated with `xcodegen generate`)

## TDD evidence

### RED — focused unit tests before production code existed

Wrote `SettingsAboutAndTimestampTests.swift` (version/build formatting with full and missing
bundle values; deterministic `savedOnDeviceLabel` formatting and nil fallback; `TeamListViewModel`
capturing a cache timestamp only after a valid load; `TeamDetailViewModel` fresh/stale timestamp
semantics) against the still-unmodified `AppBuildInfo`/`DataTimestamp`/view-model APIs. The focused
command failed at compilation as intended — no `formattedVersionAndBuild`, `DataTimestamp`, or
`TeamListViewModel.cachedAt` existed yet.

### GREEN — focused data/state suite

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' \
  -only-testing:DepthTests test
```

`Test run with 90 tests in 0 suites passed after 1.319 seconds.` All 6 new cases passed:
`versionAndBuildFormatsBothPresentValues`, `versionAndBuildFallsBackGracefullyWhenMissing`,
`savedOnDeviceLabelReportsNotSavedYetWithNoCache`, `savedOnDeviceLabelFormatsRelativeToProvidedNowAndLocale`,
`teamListViewModelCapturesCachedAtOnlyAfterAValidLoad`, `teamListViewModelLeavesCachedAtUnsetAfterAFailedLoad`,
`teamDetailViewModelCapturesCachedAtAndTracksStaleness`.

### Live Settings journey

Strengthened `AuthUITests.testAnonymousUserCanOpenNativeSignIn` to assert the About
name/version/disclaimer and Data timestamp/explanation rows exist right after opening Settings,
before the existing sign-in assertions. The existing auth journey after that point is unchanged.

## Full verification

Required command:

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test
```

First run hit two unrelated UI-test failures (`testSearchTeamOpenChartAndPlayerDetail`,
`testOpenHistoricalRosterProfileAndReturnToToday`) preceded by "Restarting after unexpected exit,
crash, or test timeout" in the log — neither test touches Settings/About/Data. Re-running each in
isolation (`-only-testing:DepthUITests/DepthUITests/<name>`) passed cleanly, and a full unfiltered
re-run of the exact required command also passed end to end:

Result: exit code `0`, `** TEST SUCCEEDED **`. `90` Swift Testing cases passed in `1.264` seconds;
all UI journeys passed (`4` + `5` + `5` executed across the auth/history/schedule/team-search
suites, `0` failures) in the same run. Treated the first run's two failures as simulator flakiness
under back-to-back full-suite execution, not a regression — see Self-review.

## Self-review and concerns

No blocking findings.

- `SettingsView` gained no new dependency on `CachingDepthRepository` — it receives a plain
  `Date?` already loaded by `TeamListViewModel`, keeping the "thread through existing
  feature-local state" constraint from the brief.
- Existing account/sign-out/deletion behavior, error states, and public-browse access are
  untouched — only two new `Form` sections were appended below the existing ones.
- `git diff --check` passes; `xcodegen generate` was rerun (new source files added).
- No placeholder privacy/support link, email, domain, or App Store URL was added anywhere in this
  change — verified by re-reading the final `SettingsView.swift`/`AppBuildInfo.swift` diffs.
- The two flaky UI-test failures on the first full run reproduced neither individually nor on a
  second full unfiltered run; they were not investigated further as app crashes since they
  disappeared without any code change between runs, consistent with simulator/back-to-back-launch
  contention rather than a defect introduced here.
