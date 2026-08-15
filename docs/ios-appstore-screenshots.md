# Native iOS App Store screenshot capture (T9D)

Design spec's Screenshots and metadata section, item 35: "Add a deterministic
`AppStoreScreenshots` XCUITest launch mode backed by a stable staging seed." This doc is
the local workflow for running it and turning the result into files you can upload to
App Store Connect — read it before touching `ios/DepthUITests/AppStoreScreenshotsUITests.swift`
or `UI_TESTING_APPSTORE_SCREENSHOTS`.

## What it captures

`AppStoreScreenshotsUITests.testCaptureAppStoreScreenshotSequence` walks one team (the
Buffalo Bills — `bills`, the repo's existing stable fixture team) through the design
spec's five-screenshot sequence and attaches a full-resolution PNG at each step:

| # | File | Screen | Suggested caption |
| --- | --- | --- | --- |
| 1 | `01-team-search.png` | Team selector/search | Every team. One clear depth chart. |
| 2 | `02-team-depth-chart.png` | Team depth chart | See every position at a glance. |
| 3 | `03-player-detail.png` | Player detail | Know who's next. |
| 4 | `04-reorder-editing.png` | Personal reorder editing | Make the chart yours. |
| 5 | `05-schedule.png` | Schedule | Context beyond the lineup. |

It runs against **Staging**, which (per `ios/xcconfig/Staging.xcconfig`'s
`TODO(DEP-40 Lane B)`) currently points at the real production Supabase project — there
is no separate staging seed to stand up for this, so "stable staging seed" means picking
one already-stable team rather than fabricating fixture data.

### Screenshot #4 — the judgment call

The reorder editor (`OverrideEditorSheet`) is normally gated on a real signed-in session
(`TeamDetailView.beginEditing`) because saving an override requires one. The design
spec's launch-mode requirement explicitly rules out fabricating a session ("without
exposing an email or test secret"), and there's no existing signed-out preview of this
UI. `OverrideEditorViewModel` itself does no network I/O until `save()` is called — its
draft list is populated from the caller-supplied `playerIds`, not a fetch — so
`UI_TESTING_APPSTORE_SCREENSHOTS` adds a narrow bypass
(`TeamDetailView.isAppStoreScreenshotMode`) that skips the sign-in gate only under this
launch argument, opening the real reorder sheet in its authentic unsaved-drag-preview
state (`.editMode = .constant(.active)`, drag handles already live). The test never taps
Save. This is scoped to be inert outside screenshot mode: the sign-in gate is untouched
for every other launch configuration.

## Running it

1. Boot a currently-accepted 6.9-inch simulator. As of this writing that's the
   **iPhone 17 Pro Max** (1320×2868 px @3x, matching Apple's published 6.9-inch
   requirement) — re-check `xcrun simctl list devicetypes -j` and Apple's current
   screenshot-spec page before every real submission, since Apple periodically retires
   the oldest accepted size class and simulator naming shifts with each generation.
2. Optionally normalize the status bar before capturing (XCUITest can't call `simctl`
   from inside the app process — this has to happen from the host shell beforehand):
   ```
   xcrun simctl status_bar <device-udid> override \
     --time "9:41" --batteryState charged --batteryLevel 100 \
     --cellularBars 4 --wifiBars 3
   ```
   Clear it afterward with `xcrun simctl status_bar <device-udid> clear`.
3. Run the test standalone. It's excluded from the default `xcodebuild test` run via
   `ios/project.yml`'s scheme-level `skippedTests` (so `ios-ci.yml` and a plain `test`
   invocation both skip it) — but `-only-testing` at the command line cannot override a
   scheme-level skip, so running it directly needs that skip temporarily removed:
   ```
   # In ios/project.yml, replace the `DepthUITests` entry under schemes.Depth.test.targets
   # with the plain `- DepthUITests` form (no skippedTests), then:
   cd ios && xcodegen generate

   xcodebuild -project Depth.xcodeproj -scheme Depth -configuration Staging \
     -destination 'platform=iOS Simulator,id=<device-udid>' \
     -only-testing:DepthUITests/AppStoreScreenshotsUITests \
     -resultBundlePath /tmp/depth-screenshots.xcresult \
     test

   # Revert project.yml back to the skippedTests form and `xcodegen generate` again
   # before committing anything — the checked-in project must match the skipped form.
   ```

## Extracting the PNGs

The five screenshots land as `XCTAttachment`s (`.keepAlways`) inside the `.xcresult`
bundle, not as loose files. Export them with `xcresulttool`:

```
xcrun xcresulttool get test-results attachments \
  --path /tmp/depth-screenshots.xcresult \
  --output-path /tmp/depth-screenshots
```

(On older Xcode/`xcresulttool` versions without the `test-results attachments`
subcommand, use `xcrun xcresulttool export attachments --legacy` instead — check
`xcrun xcresulttool --help` for what's available on the toolchain you're running.) Each
attachment is exported with its `name` as the filename prefix (`01-team-search...png`,
etc.) alongside a manifest — inspect every image at full size before upload for
clipping, stale data, placeholder artifacts, simulator chrome, personal information,
unlicensed assets, and inconsistent status-bar time (design spec item 38).

The exported PNGs are a release artifact, not source — never commit them to this repo.
