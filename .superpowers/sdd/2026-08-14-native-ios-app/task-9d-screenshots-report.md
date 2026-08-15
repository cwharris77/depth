# Task 9D report: Deterministic App Store screenshot automation

## What was built

1. **`UI_TESTING_APPSTORE_SCREENSHOTS` launch argument** (`ios/Depth/App/DepthApp.swift`,
   `ios/Depth/App/ContentView.swift`), same shape as the existing `UI_TESTING_RESET_STATE`:
   - `DepthApp.init()` clears `lastTeamId`/`lastUnit` — same effect as
     `UI_TESTING_RESET_STATE` — so the app launches at the root team-selector/search
     screen (screenshot #1). An earlier version of this task pre-selected `bills` at
     launch instead; that broke screenshot #1 by auto-navigating straight past the
     search screen into team detail (`TeamListView.restoreLastTeamIfNeeded()`), so it
     was reverted. `AppStoreScreenshotsUITests` itself searches for and taps the Bills
     row, same as the rest of `DepthUITests`, and every later screenshot in the
     sequence stays on that team for the rest of the one launch.
   - `ContentView`'s `.task` unconditionally signs out after the normal session-restore
     call, under this launch argument only — a deterministic signed-out baseline
     regardless of any real session a prior manual run left in the simulator's
     Keychain.
2. **Screenshot-only reorder-editor bypass** (`ios/Depth/Features/TeamDetail/TeamDetailView.swift`,
   `beginEditing`/`isAppStoreScreenshotMode`) — see the judgment call below.
3. **`ios/DepthUITests/AppStoreScreenshotsUITests.swift`** — one test,
   `testCaptureAppStoreScreenshotSequence`, that walks the five-screenshot sequence
   against the Buffalo Bills (the repo's existing stable fixture team) and attaches a
   full-resolution PNG at each step via `XCTAttachment(screenshot:)` /
   `XCUIScreen.main.screenshot()` with `.lifetime = .keepAlways`. Dismisses the keyboard
   before screenshot #1 so the capture isn't half-covered by the on-screen keyboard.
4. **`ios/project.yml`** — added `.accessibilityIdentifier("edit-depth-order-\(position)")`
   to each Edit Order menu item (needed for the UI test to reach a specific position
   group deterministically) and excluded `AppStoreScreenshotsUITests` from the `Depth`
   scheme's default `test` action via `skippedTests`, so `ios-ci.yml`'s existing
   `xcodebuild test` step (no flags added) and a plain local `xcodebuild test` both skip
   it automatically — no `.github/workflows/ios-ci.yml` change was needed.
5. **`docs/ios-appstore-screenshots.md`** — the local run/extract workflow, the current
   6.9-inch simulator choice and its confirmed resolution, the status-bar-normalization
   caveat, and screenshot #4's judgment call.

## Screenshot #4 (personal reorder editing) — judgment call

`TeamDetailView.beginEditing` normally requires `sessionStore.user != nil` before
opening `OverrideEditorSheet`, because saving an override needs a real session. There is
no existing signed-out preview of this UI, and the brief explicitly rules out
fabricating a real sign-in ("without exposing an email or test secret"), so I could not
reach the real authenticated flow.

I inspected `OverrideEditorViewModel` and found it does **no network I/O until `save()`
is called** — its draft list is populated from the caller-supplied `playerIds`, not a
fetch. That means the sheet itself is safe to open without a session; only tapping Save
would fail (RLS rejects an anonymous write). So I added a narrow bypass,
`TeamDetailView.isAppStoreScreenshotMode`, that skips the sign-in gate **only** under
`UI_TESTING_APPSTORE_SCREENSHOTS`, opening the real reorder sheet in its authentic
unsaved-drag-preview state (`.editMode = .constant(.active)`, drag handles already
live — see `04-reorder-editing.png` from the verification run: a live "C Order" list
with three real Bills centers and drag handles). The screenshot test never taps Save.
This is the "closest deterministic alternative" the brief anticipated, not a silent
substitution of a different screen — outside this launch argument, the sign-in gate is
completely untouched.

## Other decisions

- **6.9-inch device**: iPhone 17 Pro Max — confirmed via
  `xcrun simctl list devicetypes -j` (`modelIdentifier: iPhone18,2`) and its
  `profile.plist` (`mainScreenWidth: 1320`, `mainScreenHeight: 2868`, `mainScreenScale:
  3`), matching Apple's published 6.9-inch spec. Verified the actual captured PNGs are
  exactly 1320×2868 (`sips -g pixelWidth -g pixelHeight`).
- **Screenshot API**: `XCUIScreen.main.screenshot()`, not `XCUIApplication.screenshot()`
  — the former captures the full physical framebuffer at native device resolution
  (guaranteed to match App Store Connect's exact-pixel requirement); the latter is
  scoped to the app's window frame. Neither captures simulator bezel/chrome — that's
  rendered by Simulator.app, never in the framebuffer XCTest reads.
- **Status bar normalization**: out of reach from inside the XCUITest process (it runs
  inside the simulator, and `Process`/shell spawning isn't available on iOS) —
  documented as a host-side `xcrun simctl status_bar <udid> override …` pre-step in
  `docs/ios-appstore-screenshots.md`, not automated in this PR.
- **No animation-disabling hook added**: grepped the app for `withAnimation`/
  `.animation(`/reduce-motion checks — there are none; every transition is SwiftUI's
  default implicit navigation/sheet animation, already synchronized by the same
  generous `waitForExistence` pattern the rest of `DepthUITests` uses. Didn't add new
  "instant transitions" plumbing since nothing in the five captured screens exhibited a
  timing race in three separate verification runs.
- **Fifth screenshot chose Schedule over native Share**: both are allowed by the brief;
  Schedule renders real in-app content (a marketing screenshot showing the app, not an
  OS share sheet mostly full of other apps), matching the spec's "Context beyond the
  lineup" caption better.
- **CI exclusion via `project.yml` scheme `skippedTests`, not an `ios-ci.yml` flag**:
  simpler and keeps the "don't touch files T9A/T9B/T9C already touched beyond what's
  needed" constraint — `ios-ci.yml`'s `test` job needed zero changes. Caveat found while
  verifying: `-only-testing` at the command line **cannot** override a scheme-level
  skip (confirmed empirically — a first standalone run reported "Executed 0 tests").
  Running the screenshot test standalone therefore requires temporarily removing the
  `skippedTests` entry and regenerating, documented step-by-step in
  `docs/ios-appstore-screenshots.md`.

## Test evidence

- Full house verification (`xcodebuild … test`, iPhone 17 Pro Max simulator, Staging
  config): **`** TEST SUCCEEDED **`** — `DepthTests` 2/2, `DepthUITests` 9/9
  (`AuthUITests` 1, `DepthUITests` 4, `PerformanceUITests` 3, `ShareUITests` 1);
  `AppStoreScreenshotsUITests` correctly excluded (test count matches the pre-T9D
  baseline exactly).
- Screenshot suite standalone (`-only-testing:DepthUITests/AppStoreScreenshotsUITests`,
  same simulator, `skippedTests` temporarily removed): **`** TEST SUCCEEDED **`**,
  `Executed 1 test, with 0 failures`.
- Verified real screenshot output by exporting the `.xcresult`
  (`xcrun xcresulttool export attachments`): five PNGs
  (`01-team-search`, `02-team-depth-chart`, `03-player-detail`, `04-reorder-editing`,
  `05-schedule`), each confirmed **exactly 1320×2868 px** via `sips`. Visually inspected
  all five at full size: real Buffalo Bills roster/schedule data, no clipping, no
  placeholder/shimmer artifacts, no simulator chrome, no personal information beyond
  public NFL roster data, consistent status-bar time across the sequence (keyboard
  hidden in screenshot #1 after an added dismiss step; first attempt showed the
  on-screen keyboard covering the result, fixed before finalizing).
- `git diff --exit-code -- ios/Depth.xcodeproj` clean against the final `project.yml`
  (new file references + the `skippedTests` scheme entry only).

## Out-of-scope finding (flagged separately, not fixed here)

While inspecting the `05-schedule.png` screenshot I found the season picker renders the
year with a thousands separator — **"2,026"** instead of "2026" — in
`ScheduleView.swift`'s `Text("\(season)")` (a `LocalizedStringKey` interpolation of a
plain `Int` applies SwiftUI's default locale-aware number formatting). Pre-existing,
unrelated to this task's launch-mode/test work; flagged as a separate background task
rather than fixed in this one-concern PR.
