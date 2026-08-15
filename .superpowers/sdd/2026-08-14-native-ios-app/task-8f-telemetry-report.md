# Task 8F — Privacy-minimal crash reporting and analytics Report

## Implementation

### Crash reporting (documentation only)

`docs/ios-privacy-telemetry.md` documents that Apple's own TestFlight/App Store Connect
crash-collection pipeline satisfies the "lightweight crash reporting" requirement — no
SDK, no dependency, no code, user opt-in at the OS level, no third-party destination.
Confirmed with Cooper before writing anything (a third-party SDK was the alternative
considered and declined — it would be a new dependency and its own App Privacy entry).

### Analytics

- `supabase/migrations/20260815084146_add_app_events.sql` adds `app_events`: `id`,
  `event_name` (`CHECK`-constrained to the six known names), `error_category`
  (`CHECK`-constrained to present-iff-`event_name='error'` and one of `DepthError`'s
  eight case names), `created_at`. RLS on; `anon, authenticated` get an `INSERT`-only
  policy; `service_role` gets full grants and bypasses RLS for reads.
- `ios/Depth/Support/AppEventsRecorder.swift`: `AppEvent` enum (six cases, `name`/
  `errorCategory` computed), `AppEventsRecording` protocol, `SupabaseAppEventsRecorder`
  (fire-and-forget `Task.detached` insert, silently drops failures), and
  `NoOpAppEventsRecorder` (test/preview double).
- `DepthError.telemetryCategory` / `DepthAuthError.telemetryCategory` — the case name
  only, never the associated diagnostic string; auth errors reuse `DepthError`'s
  vocabulary (coarse buckets: `invalidEmail`/`invalidCode`/`expiredCode`/`rateLimited`/
  `freshOtpRequired` → `"validation"`, etc.) rather than adding auth-specific DB
  categories.
- Wired into five call sites, each via a default-valued `events: any AppEventsRecording
  = NoOpAppEventsRecorder()` constructor parameter (every existing test call site keeps
  compiling untouched) with production call sites explicitly passing
  `DepthEnvironment.appEvents`:
  - `ContentView`'s root `.task` — `app_launch`, once per app launch.
  - `TeamListViewModel.load()` — `.error` on failure, nothing on success.
  - `TeamDetailViewModel.load()` — `depth_chart_reached` on the *first* successful load
    only (a `firstLoad` flag captured before the fetch); `.error` only when no snapshot
    is already on screen, matching the existing "retain last-good data" failure
    semantics (a background-refresh failure after a good snapshot fires nothing).
  - `AuthFlowViewModel.sendCode()`/`verifyCode()` — `auth_started`/`auth_completed` on
    success, `.error` on failure.
  - `OverrideEditorViewModel.save()` — `override_saved` on success, `.error` on both the
    pre-network validation guards (empty group, duplicate player) and a write failure.
- Threaded `events` through `TeamListView` → `TeamDetailView`/`AccountSettingsButton` →
  `SettingsView`/`AuthSheet`, and `TeamDetailView` → its own `AuthSheet` (override
  sign-in) and `OverrideEditorViewModel`.

## Files

- `supabase/migrations/20260815084146_add_app_events.sql` (new)
- `lib/database.types.ts` (regenerated)
- `docs/ios-privacy-telemetry.md` (new)
- `ios/Depth/Support/AppEventsRecorder.swift` (new)
- `ios/Depth/Support/DepthEnvironment.swift`
- `ios/Depth/Data/DepthError.swift`
- `ios/Depth/Features/Auth/DepthAuthService.swift`
- `ios/Depth/Features/Auth/AuthFlowViewModel.swift`
- `ios/Depth/Features/Auth/AuthSheet.swift`
- `ios/Depth/Features/Settings/OverrideEditorViewModel.swift`
- `ios/Depth/Features/Settings/SettingsView.swift`
- `ios/Depth/Features/TeamDetail/TeamDetailView.swift`
- `ios/Depth/Features/TeamDetail/TeamDetailViewModel.swift`
- `ios/Depth/Features/Teams/TeamListView.swift`
- `ios/Depth/Features/Teams/TeamListViewModel.swift`
- `ios/Depth/App/ContentView.swift`
- `ios/DepthTests/AppEventsTests.swift` (new)
- `ios/DepthTests/RecordingAppEventsRecorder.swift` (new)
- `ios/DepthTests/SupabaseRLSIntegrationTests.swift`
- `ios/Depth.xcodeproj/project.pbxproj` (regenerated with `xcodegen generate`)

## TDD evidence

### Focused telemetry suite

`ios/DepthTests/AppEventsTests.swift` covers: `AppEvent` name/category mapping;
`DepthError`/`DepthAuthError` `telemetryCategory` for every case; `TeamListViewModel`
records exactly one `.error` on failure and nothing on success; `TeamDetailViewModel`
records `depthChartReached` exactly once across two successful loads (not per-load), one
`.error` on a first-load failure, and *nothing* on a background-refresh failure after a
good snapshot; `AuthFlowViewModel` records `authStarted`/`authCompleted` on success and
an `.error` (not a mislabeled success event) on failure; `OverrideEditorViewModel`
records `overrideSaved` on success and `.error` on both validation and write failures.

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' \
  -only-testing:DepthTests test
```

`Test run with 111 tests in 0 suites passed after 1.495 seconds` after the initial
telemetry pass (96 prior + 15 new); `116` after adding the RLS suite below.

### RLS integration

Added to `SupabaseRLSIntegrationTests.swift` against local Supabase: anonymous can
insert an event; anonymous cannot read (privilege-level denial, same shape as
`app_config`'s anon-write case, not an RLS-filtered empty result); an unknown
`event_name` is rejected by the `CHECK` constraint; an `error_category` on a non-`error`
event is rejected by the compound `CHECK`; service role can insert and read.

## Full verification

Required command:

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test
```

Result: exit code `0`, `** TEST SUCCEEDED **`. `116` Swift Testing cases passed in
`1.393` seconds; all `6` XCUITest journeys passed (`0` failures).

Web/TS side: `npx tsc --noEmit` exit 0; `npm test` → `84` test files, `1398` passed / `13`
skipped; `npm run format:check` → clean. `supabase db reset` applied the new migration
cleanly against local Postgres; `git diff lib/database.types.ts` shows exactly the new
`app_events` table shape and nothing else.

## Self-review and concerns

No blocking findings.

- No third-party SDK, no new npm/SwiftPM dependency anywhere in this change.
- `app_events` has no column capable of identifying a user or device — verified by
  re-reading the migration's full column list against the design doc's own claim.
- Every telemetry call site is fire-and-forget: `SupabaseAppEventsRecorder.record`
  never `await`s from the caller's perspective and never throws.
- `depth_chart_reached`'s once-per-visit semantics rely on `firstLoad` being captured
  *before* the network call in `TeamDetailViewModel.load()` — re-verified this isn't
  racy under the existing dedup/cache-first behavior, since `load()` itself isn't
  concurrently re-entrant per view-model instance (one `TeamDetailViewModel` per
  navigation push).
- Account-deletion reauthentication remains uninstrumented — deliberately out of scope
  per the brief (not one of the five named metrics; it already has its own
  correlation-id support path).
- `git diff --check` passes; `xcodegen generate` was rerun (new `AppEventsRecorder.swift`,
  `AppEventsTests.swift`, `RecordingAppEventsRecorder.swift`).
