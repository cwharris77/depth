# Native iOS App Store screenshot capture (T9D)

Design spec's Screenshots and metadata section, item 35: "Add a deterministic
`AppStoreScreenshots` XCUITest launch mode backed by a stable staging seed." This doc is
the local workflow for running it and turning the result into files you can upload to
App Store Connect — read it before touching `ios/DepthUITests/AppStoreScreenshotsUITests.swift`
or `UI_TESTING_APPSTORE_SCREENSHOTS`.

## What it captures

`AppStoreScreenshotsUITests.testCaptureAppStoreScreenshotSequence` walks the app's five
strongest surfaces and attaches a full-resolution PNG at each step:

| # | File | Screen | Team | Suggested caption |
| --- | --- | --- | --- | --- |
| 1 | `01-depth-chart-offense.png` | Offensive depth chart | Seahawks | Depth charts for all 32 teams |
| 2 | `02-depth-chart-defense.png` | Defensive depth chart | Broncos | Offense, defense and special teams |
| 3 | `03-team-stats.png` | Team stats | Chargers | Team stats, records and rankings |
| 4 | `04-compare.png` | Compare, "By team" | Chiefs vs Eagles | Compare any two teams head to head |
| 5 | `05-uniform-archive.png` | Uniform archive | all 32 | See your team’s look across the eras |

Captions are **ASO copy, not mood copy** (rewritten 2026-08-28): they carry the search terms the
keyword field can't afford to repeat, and they deliberately contain **no "NFL" and no team
marks** — the app identifies teams by name *inside itself* under the non-affiliation disclaimer,
but listing copy is marketing, which is where an unlicensed mark starts implying endorsement.
"Pro football" carries the same intent without the mark. See DEP-162's listing-copy section for
the full set of store fields this matches.

Teams are **pinned, not incidental** — reruns stay byte-comparable, and no single team
dominates the listing. Shot 1 needs no navigation at all: screenshot mode clears
`lastTeamId`, so startup falls back to `StartupTeam.defaultTeamId` (`seahawks`).

It runs against **Staging**, which (per `ios/xcconfig/Staging.xcconfig`'s
`TODO(DEP-40 Lane B)`) currently points at the real production Supabase project — there
is no separate staging seed to stand up for this, so "stable staging seed" means picking
already-stable teams rather than fabricating fixture data.

### Why this sequence (2026-08-28)

It replaced an earlier team-search / depth-chart / player-detail / reorder / schedule set.
Two of those shots were actively harmful and both passed their assertions perfectly — a
reminder that this test proves *reachability*, never that a frame is worth uploading:

- **Team search** typed a query before capturing, so it rendered one result row above
  ~70% empty black while captioned "Every team."
- **Reorder editing** reused the same player card as the player-detail shot. The only
  visible difference was the row drag grips, so two of five slots showed what reads as the
  same image at thumbnail size.

### Screenshot #3 — why it selects a completed season

The capture explicitly picks 2025 rather than accepting the default. Compare detects an
empty current season and falls back on its own (`compare-season-fallback`); the stats page
honours the current season literally, so before week 1 it renders an all-zero page — 0-0
record, 0 points for, 0 against. Accurate, but it reads as a broken app in a listing.

The year is pinned because the picker's identifiers are season-numbered
(`stats-season-<year>`). **Bump it once the current season has real data** — a stale
constant fails loudly, which is the right failure for a manually-run release tool.

## Running it

**One command** — `ios/scripts/capture-appstore-screenshots.sh` wraps the whole pipeline
(see its header for the full contract): it resolves the newest 1284×2778-class simulator
(**iPhone 13 Pro Max**, the 6.5-inch display class), boots a **disposable** instance,
normalizes the status bar, runs the capture test against the dedicated
`Depth-AppStoreScreenshots` scheme (which carries no `skippedTests`, so no `project.yml`
editing is ever needed), exports the PNGs, verifies them (exactly five, 1284×2778, no
alpha), and tears the simulator down:

```
ios/scripts/capture-appstore-screenshots.sh
```

Output lands raw (unframed, no alpha) in a deterministic, gitignored directory:

```
Screenshots/<device>/01-depth-chart-offense.png
Screenshots/<device>/02-depth-chart-defense.png
Screenshots/<device>/03-team-stats.png
Screenshots/<device>/04-compare.png
Screenshots/<device>/05-uniform-archive.png
```

where `<device>` is the resolved simulator type slug (e.g. `iPhone-13-Pro-Max`).

### Why 1284×2778 (2026-08-28)

The pipeline originally captured **1320×2868** on the iPhone 17 Pro Max (6.9-inch class).
App Store Connect rejected that outright with: *"Screenshots dimensions should be:
1242 × 2688px, 2688 × 1242px, 1284 × 2778px or 2778 × 1284px"* — i.e. this app record's
upload flow is accepting the **6.5-inch display class**, not the 6.9-inch class. Apple's
current screenshot guide confirms 1284×2778 (and 1242×2688) are the 6.5-inch class sizes,
and that **if 6.9-inch screenshots aren't provided, the 6.5-inch ones are required and get
scaled up to fill 6.9-inch displays** — so a single 1284×2778 set is sufficient.

The 1284×2778 class maps to the **iPhone 12/13 Pro Max** (428×926pt @3x); newer Pro Max
iPhones are 1290×2796 or 1320×2868 and are *not* accepted here. The capture script pins to
the newest iPhone in the class (iPhone 13 Pro Max) and refuses to emit a PNG that isn't
exactly 1284×2778, so a wrong device pick fails loudly instead of quietly producing
unusable files.

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
  -destination 'platform=iOS Simulator,id=<an iPhone 13 Pro Max simulator UDID>' \
  -only-testing:DepthUITests/AppStoreScreenshotsUITests \
  -resultBundlePath /tmp/depth-screenshots.xcresult \
  test

xcrun simctl status_bar <device-udid> clear
```

As of this writing the capture targets the **iPhone 13 Pro Max** (1284×2778 px @3x, the
newest device in the App Store Connect 6.5-inch display class this app's upload flow
accepts) — re-check `xcrun simctl list devicetypes -j` and Apple's current screenshot-spec
page before every real submission, since Apple periodically retires the oldest accepted
size class and simulator naming shifts with each generation. The capture script refuses to
emit a PNG that isn't exactly 1284×2778, so a wrong pick fails loudly instead of quietly
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
attachment is exported with its `name` as the filename prefix (`01-depth-chart-offense...png`,
etc.) alongside a manifest — rename each export to drop the `xcresulttool` suffix (so the
file is exactly `01-depth-chart-offense.png` etc.) and inspect every image at full size before
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
`01-depth-chart-offense.png` etc. — `ios/fastlane/screenshots/Framefile.json`'s `filter` keys
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
