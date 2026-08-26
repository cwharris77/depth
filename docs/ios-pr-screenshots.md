# Native iOS PR screenshot capture (agent-triggered)

The iOS analog of checking a web PR's Vercel build. An agent (or Cooper) that changed an
iOS screen triggers a capture of that screen as PNGs — driven by a headless XCUITest on a
**disposable simulator**, so nothing stays booted and no shared local simulator pool is
needed (the pool-starving-RAM problem from parallel worktrees). The PNGs are consumed
like a preview URL: read them back, don't hold a live sim.

This is not an automated per-PR gate. It's an **on-demand** tool an agent invokes when it
edits an iOS screen and wants to confirm how it renders — the same role `/pr-screenshots`
plays for web. See `docs/ios-appstore-screenshots.md` for the sibling, fixed-sequence
release-prep capture; this one is parameterized by target.

## What it captures

`ios/DepthUITests/PRScreenshotsUITests.swift` launches `UI_TESTING_RESET_STATE` (the same
anonymous, no-restored-team clean slate as every other deterministic UI journey), drives
to the stable **Buffalo Bills** chart (via `UITestHelpers.selectTeam`, the App Store
sequence's fixture team), then captures the requested targets. Each is a
`XCUIScreen.main.screenshot()` full-framebuffer attachment (`.keepAlways`), same API the
App Store sequence uses.

| Target | Screen the agent edited |
| --- | --- |
| `field` | The depth-chart field surface (grass gradient, yard lines, end zones, LOS, hash marks) — the app's signature screen. The default. |
| `field-footer` | The team page scrolled below the field, including the inline FTN attribution. |
| `formations` | The formations sheet scrolled through every formation to its attribution footer. |
| `teams` | A filtered team-search result. |
| `uniform` | The uniform picker sheet (thumbnail corner radius, kit list). |
| `player` | A player detail sheet (opened from a filled depth-chart slot). |
| `settings` | The Settings sheet, signed-out state (the only state reachable from the anonymous clean slate). |

Anything outside the documented targets is ignored. Requesting nothing (or only unknown
tokens) falls back to `field` so a capture never silently produces zero screenshots.

## Running it

### Easy path — `ios/scripts/screenshot-check.sh`

A wrapper that does everything: builds the current worktree's app, boots a disposable
simulator, runs the capture test, exports the PNGs, and shuts the sim down. Uses a
worktree-local `ios/.derivedData` (gitignored) so parallel worktrees don't collide.

```sh
# Capture the depth-chart field (default) from the current code:
ios/scripts/screenshot-check.sh

# Capture the field and both attribution placements:
ios/scripts/screenshot-check.sh -t field,field-footer,formations

# Capture "before" from main + "after" from your branch (before/after pair):
ios/scripts/screenshot-check.sh --base main -t field,field-footer,formations
```

Output: `ios/.pr-screenshots/after/<target>.png` (and `before/` when `--base` given) —
gitignored, never committed. See the script's `-h` for all flags.

### Raw `xcodebuild` path

The capture test is **excluded from the default `Depth` scheme** (same `skippedTests`
treatment as `AppStoreScreenshotsUITests`) so it never runs in `ios-ci.yml`. It also can't
be reached by `-only-testing` against that scheme — `-only-testing` can't override a
scheme-level skip. So the repo has a dedicated **`Depth-PRScreenshots` scheme** (no skip)
that both the workflow and local runs target.

```sh
cd ios && xcodegen generate && cd ..

SCREENSHOT_TARGETS="field,uniform" \
xcodebuild -project ios/Depth.xcodeproj -scheme Depth-PRScreenshots \
  -configuration Staging \
  -destination 'platform=iOS Simulator,id=<sim-udid>' \
  -only-testing:DepthUITests/PRScreenshotsUITests \
  -resultBundlePath /tmp/pr-ios-screenshots.xcresult \
  test
```

## Extracting the PNGs (if you run the test locally instead of the workflow)

The captured PNGs land as `XCTAttachment`s (`.keepAlways`) inside the `.xcresult`
bundle, not as loose files. Export them with `xcresulttool` — the exact subcommand
varies by Xcode version (26.6 uses `export attachments`; older/newer toolsets use
`get test-results attachments`), so pick the one `xcrun xcresulttool --help` shows on
your toolchain:

```
xcrun xcresulttool export attachments --path /tmp/pr-ios-screenshots.xcresult --output-path /tmp/pr-ios-shots
# or:
xcrun xcresulttool get test-results attachments --path /tmp/pr-ios-screenshots.xcresult --output-path /tmp/pr-ios-shots
```

Each attachment is exported with its `name` as the filename prefix (`field...png`,
`uniform...png`) alongside a `manifest.json`. Inspect every image before relying on it
for a PR decision.

> Scheme catch: always `xcodegen generate` and commit the regenerated `Depth.xcodeproj`
> with any `project.yml` change (CI's `git diff --exit-code` enforces sync). The
> `Depth-PRScreenshots` scheme is a committed file under
> `ios/Depth.xcodeproj/xcshareddata/xcschemes/` — it must ship with the code the workflow
> references.

## GitHub Actions workflow (`.github/workflows/ios-pr-screenshots.yml`)

On a PR, the repo owner or a collaborator writes a comment:

- `/ios-screenshots` — captures the default `field` target
- `/ios-screenshots field,uniform` — captures those two

The workflow passes the targets to the test runner by baking `SCREENSHOT_TARGETS` into the
scheme's TestAction environment variable (via `xcodegen generate` + a `perl` patch on the
generated `Depth-PRScreenshots.xcscheme`) — the only channel that reliably reaches the
XCUITest runner. Passing it as a plain process env var to `xcodebuild test` does NOT
reach the runner (DEP-280), so the scheme env is the transport.

The workflow captures **before** (the PR's base branch) then **after** (the PR head) —
sequential on the same GitHub-hosted `macos-latest` runner, booting one **disposable**
current-flagship iPhone simulator for both — and:

1. Uploads the full-res PNGs as a `pr-ios-screenshots` workflow artifact (30-day retention), and
2. Uploads width-500 JPEG previews to Cloudinary and posts a PR comment that embeds them
   inline as `![before](...)` / `![after](...)` markdown (external image URLs render in
   comments; data-URI images do not). Same unsigned-preset upload as the web
   `/pr-screenshots` skill, under a `pr-ios-screenshots/<repo>/<pr>` folder.

Cloudinary env vars `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_UPLOAD_PRESET` (the non-secret
unsigned preset from `/setup-pr-screenshots`) must exist as repo secrets for the inline
embed to work; the artifact download is still posted if they're absent.

Why the dedicated scheme rather than editing the default one: the default scheme's
`skippedTests` can't be overridden by `-only-testing` (documented friction in
`docs/ios-appstore-screenshots.md`), so a parallel scheme is the clean way to keep the
capture out of main CI while still making it directly invocable.

This is exactly the "check the Vercel build" pattern: an agent triggers it, GitHub's
macOS does the heavy lifting, and the artifact is the preview you inspect — no shared
local Simulator, no booted-sim RAM contention across parallel worktrees.

This repo is public, so the workflow gates the trigger: only the repo owner or a
collaborator may invoke it (an `authz` step fails fast on any other commenter) — keeps
unlimited macOS build minutes from being farmable by a passerby comment.

## Notes / caveats

- **Staging points at production** (same as the App Store sequence — see that doc's
  `TODO(DEP-40 Lane B)`). Captures read real production data via the stable Bills fixture.
- **Screenshots are for visual decision support, not pixel-perfect CI gates.** Treat "does
  it look right" as the signal, same as a Vercel preview URL.
- **Never commit the exported PNGs.** They're a workflow artifact / `xcresult`
  attachment, not source (same rule as `docs/ios-appstore-screenshots.md`).
- **Add targets by appending a token + a `if requested.contains(...)` block** in
  `PRScreenshotsUITests.swift`. Keep it to a handful of high-signal screens (YAGNI — don't
  enumerate every tab).
