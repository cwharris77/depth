# Native iOS App Store screenshot capture (T9D)

Design spec's Screenshots and metadata section, item 35: "Add a deterministic
`AppStoreScreenshots` XCUITest launch mode backed by a stable staging seed." This doc is
the local workflow for running it and turning the result into files you can upload to
App Store Connect — read it before touching `ios/DepthUITests/AppStoreScreenshotsUITests.swift`
or `UI_TESTING_APPSTORE_SCREENSHOTS`.

## What it captures

`AppStoreScreenshotsUITests.testCaptureAppStoreScreenshotSequence` walks one team (the
Buffalo Bills — `bills`, the repo's existing stable fixture team) through the design
spec's five-screenshot sequence and attaches a full-resolution PNG at each step. The app
now launches directly into a depth chart (2026-08-15 navigation-parity spec) rather than
a searchable team list, so screenshot #1 captures the team switcher sheet — opened via
the `team-switcher-button` in the chart's navigation bar — instead of an app-root list;
screenshots #2–#5 follow selecting the Buffalo Bills from that sheet, unchanged:

| # | File | Screen | Suggested caption |
| --- | --- | --- | --- |
| 1 | `01-team-search.png` | Team switcher sheet | Every team. One clear depth chart. |
| 2 | `02-team-depth-chart.png` | Team depth chart | See every position at a glance. |
| 3 | `03-player-detail.png` | Player detail | Know who's next. |
| 4 | `04-reorder-editing.png` | Personal reorder editing | Make the chart yours. |
| 5 | `05-schedule.png` | Schedule | Context beyond the lineup. |

It runs against **Staging**, which (per `ios/xcconfig/Staging.xcconfig`'s
`TODO(DEP-40 Lane B)`) currently points at the real production Supabase project — there
is no separate staging seed to stand up for this, so "stable staging seed" means picking
one already-stable team rather than fabricating fixture data.

### Screenshot #4 — how reorder editing is reached signed-out

The original T9D implementation needed a judgment call here: the old per-position
`OverrideEditorSheet` was gated on a real signed-in session, and the design spec's
launch-mode requirement explicitly rules out fabricating a session ("without exposing an
email or test secret"), so the capture added a narrow `isAppStoreScreenshotMode` bypass
to open the sheet's authentic unsaved-drag-preview state. That bypass is **gone now**:
DEP-219 made depth-chart editing local-first (no sign-in needed to reorder — only
cross-device sync needs an account, matching web's `localStorage` model), and DEP-231
replaced the standalone editor with an app-level "Edit Depth Chart" toggle. Screenshot #4
today opens a real player card already in reorder mode via that toggle — genuinely
reachable signed-out, no launch-argument special-casing in the app.

## Running it

**One command** — `ios/scripts/capture-appstore-screenshots.sh` wraps the whole pipeline
(see its header for the full contract): it resolves the newest 6.9-inch "iPhone N Pro
Max"-class simulator, boots a **disposable** instance, normalizes the status bar, runs
the capture test against the dedicated `Depth-AppStoreScreenshots` scheme (which carries
no `skippedTests`, so no `project.yml` editing is ever needed), exports the PNGs, verifies
them (exactly five, 1320×2868, no alpha), and tears the simulator down:

```
ios/scripts/capture-appstore-screenshots.sh
```

Output lands raw (unframed, no alpha) in a deterministic, gitignored directory:

```
Screenshots/<device>/01-team-search.png
Screenshots/<device>/02-team-depth-chart.png
Screenshots/<device>/03-player-detail.png
Screenshots/<device>/04-reorder-editing.png
Screenshots/<device>/05-schedule.png
```

where `<device>` is the resolved simulator type slug (e.g. `iPhone-17-Pro-Max`).

The script normalizes the status bar itself (`xcrun simctl status_bar override --time
"9:41" …`) because the XCUITest process runs inside the simulator and can't call
`simctl` — that's how every capture shares the same time/signals without a manual pre-
step. Note the override is best-effort across iOS versions: on some recent simulators it
no longer alters the captured framebuffer, so the set stays consistent because all five
captures land within the same minute (the run takes ~40s) — inspect screenshot #1 vs #5
and re-run if the clock rolled over mid-run. It also settles animations for the mode:
`AppStoreScreenshotsUITests` launches with the existing `UI_TESTING_REDUCE_MOTION`
argument so the edit-mode dot wiggle and button press-scale are static in the captures.

### Running by hand (no script)

To run the test alone, use the dedicated scheme — the default `Depth` scheme's
scheme-level `skippedTests` cannot be overridden by `-only-testing` at the command line:

```
xcrun simctl status_bar <device-udid> override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --cellularBars 4 --wifiBars 3

xcodebuild -project ios/Depth.xcodeproj -scheme Depth-AppStoreScreenshots \
  -configuration Staging \
  -destination 'platform=iOS Simulator,id=<a 6.9-inch simulator UDID>' \
  -only-testing:DepthUITests/AppStoreScreenshotsUITests \
  -resultBundlePath /tmp/depth-screenshots.xcresult \
  test

xcrun simctl status_bar <device-udid> clear
```

As of this writing the currently-accepted 6.9-inch simulator is the **iPhone 17 Pro Max**
(1320×2868 px @3x, matching Apple's published 6.9-inch requirement) — re-check
`xcrun simctl list devicetypes -j` and Apple's current screenshot-spec page before every
real submission, since Apple periodically retires the oldest accepted size class and
simulator naming shifts with each generation. The capture script refuses to emit a PNG
that isn't exactly 1320×2868, so a non-6.9-inch pick fails loudly instead of quietly
producing unusable files.

## Extracting the PNGs

When you run via the script, the five screenshots are already written to
`Screenshots/<device>/<index>-<name>.png` — nothing further to extract. The steps below
are only for the by-hand path above.

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
etc.) alongside a manifest — rename each export to drop the `xcresulttool` suffix (so the
file is exactly `01-team-search.png` etc.) and inspect every image at full size before
upload for clipping, stale data, placeholder artifacts, simulator chrome, personal
information, unlicensed assets, and inconsistent status-bar time (design spec item 38).

The exported PNGs are a release artifact, not source — never commit them to this repo.

## Framing for App Store Connect

The raw captures above are correct-resolution but plain — no device bezel, no marketing
caption. `frameit` (part of the `fastlane` gem, Bundler-scoped to `ios/` via `Gemfile`/
`Gemfile.lock` — not a system-wide gem install) adds both, reading the five captions
straight from this doc's table.

One-time setup:
```
brew install imagemagick   # frameit's rendering dependency
cd ios && bundle install   # installs fastlane into ios/vendor/bundle (gitignored)
bundle exec fastlane frameit download_frames   # caches device bezels in ~/.frameit/
```

Then, after exporting the PNGs above into `ios/fastlane/screenshots/en-US/` (rename each
export to drop `xcresulttool`'s manifest suffix, so the file is exactly
`01-team-search.png` etc. — `ios/fastlane/screenshots/Framefile.json`'s `filter` keys
match on that base name):
```
cd ios && bundle exec fastlane frameit path:./fastlane/screenshots
```

This writes `<name>_framed.png` next to each raw capture — those are the files to
upload to App Store Connect, not the raw ones. Two things to know about the setup:

- **Font is not committed.** `Framefile.json` points at `./SFNS.ttf` inside the
  screenshots folder, but that file is gitignored — copy it once per machine from the
  OS (`cp /System/Library/Fonts/SFNS.ttf ios/fastlane/screenshots/SFNS.ttf`). It's
  Apple's own system font (matches the app's SwiftUI default), and Apple's font
  license permits *referencing* the system copy but not redistributing the file — so
  it's copied locally, never checked in. A relative path is required here, not an
  absolute one — `frameit`'s Ruby path-joining silently mangles a leading `/` by
  concatenating it onto the screenshots directory instead of treating it as rooted.
- **`ios/fastlane/screenshots/background.png` and `Framefile.json` are the only
  committed files** in that folder — they're the reusable frame background and caption
  config, not per-run output. Everything under `en-US/` (raw + `_framed` captures) and
  the copied font are gitignored, same as the `.xcresult`-exported PNGs above.

`bundle exec fastlane frameit` (not a bare `fastlane frameit`) matters — it resolves
against `ios/Gemfile.lock`'s pinned fastlane version rather than whatever's on `$PATH`.
