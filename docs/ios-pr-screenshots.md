# Native iOS PR screenshot capture

The iOS analog of checking a web PR's Vercel build. Every PR that touches iOS UI ships
with screenshots **in its body** — captured locally (no CI action) by a headless
XCUITest on a **disposable simulator**, so nothing stays booted and no shared local
simulator pool is needed (the pool-starving-RAM problem from parallel worktrees). The
PNGs are consumed like a preview URL: read them back, don't hold a live sim.

The driver is `ios/scripts/pr-screenshots.sh`: it decides which screens the diff can
reach (see "Every UI PR ships screenshots in the body" below), captures, diffs, uploads,
and fills the PR body. The underlying pieces (`screenshot-check.sh`, the
`Depth-PRScreenshots` scheme, `PRScreenshotsUITests`) are the same on-demand machinery
the old GitHub Action used — just run locally now. See
`docs/ios-appstore-screenshots.md` for the sibling, fixed-sequence release-prep capture.

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

### For a PR: `ios/scripts/pr-screenshots.sh` (the one command)

The driver every UI PR runs via the `ship-pr` skill. Decides targets from the diff,
captures, diffs, uploads, and fills a PR body file — see **"Every UI PR ships
screenshots in the body"** below for the full pipeline.

```sh
# from the repo root, after the branch is committed:
ios/scripts/pr-screenshots.sh --body-file /tmp/pr-body.md
gh pr create --body-file /tmp/pr-body.md
```

### Manual capture: `ios/scripts/screenshot-check.sh`

A wrapper that does everything: builds the current worktree's app, boots a disposable
simulator, runs the capture test, exports the PNGs, and shuts the sim down. Uses a
worktree-local `ios/.derivedData` (gitignored) so parallel worktrees don't collide.
Targets come from `ios/scripts/suggest-pr-targets.sh` (diff-driven) or `-t`.

```sh
# Capture the depth-chart field (default) from the current code:
ios/scripts/screenshot-check.sh

# Capture the field and both attribution placements:
ios/scripts/screenshot-check.sh -t field,field-footer,formations

# Capture "before" from main + "after" from your branch (before/after pair).
# This also runs the visual diff and writes diff/<target>.diff.png + summary.json:
ios/scripts/screenshot-check.sh --base main -t field,field-footer,formations
```

Output: `ios/.pr-screenshots/after/<target>.png` (and `before/` when `--base` given),
plus `diff/` (visual diff) — gitignored, never committed. See the script's `-h` for
all flags.

**The "before" side is cached and defaults to the local Supabase stack:**

- **Baseline cache.** `--base` PNGs are cached by `(base ref sha, target)` under
  `ios/.pr-screenshots-cache/` (gitignored) — the base ref's rendering hasn't changed
  since the last run that captured it, so a repeat run with the same base and targets
  reuses the cached PNGs and skips the base worktree build + sim boot entirely. The
  cache key is the resolved commit sha, not the ref string, so rebasing `main` (or any
  base branch moving forward) changes the key automatically — a rebased PR never
  compares against a stale image. Pass `--recapture-base` to force a fresh capture
  regardless of what's cached.
- **Local stack by default.** `-c` (build configuration) now defaults to `Debug`
  instead of `Staging` — `Debug.xcconfig` points at the local `supabase start` stack
  (DEP-270) instead of production, so a PR that ships a migration/ingest change
  alongside the UI that reads it renders the "after" side against the real migrated
  data. Pass `-c Staging` to capture against production instead (fine for a
  pure-rendering change with no local stack running). When `-c Debug` is in effect the
  script checks `http://127.0.0.1:54321` before capturing anything and fails loudly —
  "Run `supabase start` first" — rather than silently capturing empty/error screens
  against a dead local stack.

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
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=<sim-udid>' \
  -only-testing:DepthUITests/PRScreenshotsUITests \
  -resultBundlePath /tmp/pr-ios-screenshots.xcresult \
  test
```

`-configuration Debug` reads the local `supabase start` stack (`Debug.xcconfig`);
swap in `Staging` to capture against production instead.

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

## Every UI PR ships screenshots in the body — `ios/scripts/pr-screenshots.sh`

The UI-screenshot pass for PRs is **local and deterministic** — no GitHub Action. The
Action was removed (`.github/workflows/ios-pr-screenshots.yml`): it ran only when
someone remembered to comment `/ios-screenshots`, burned ~15 min of macOS runner,
and posted a *comment* instead of filling the PR body.

`ios/scripts/pr-screenshots.sh` replaces it with one local command that the `ship-pr`
skill runs for every PR before `gh pr create`:

1. **Decides targets from the diff** — `suggest-pr-targets.sh` matches changed files
   against `ios/scripts/pr-target-map.txt` (screenmap-style "suspects", native
   SwiftUI edition). No iOS UI touched → the `## Screenshots` section is stripped
   from the body. iOS touched but no target matches → warns and defaults to `field`.
2. **Captures** via `screenshot-check.sh --base <ref>` (before/after on a disposable
   simulator, status bar frozen at 9:41).
3. **Computes the visual diff** — `scripts/diff-pr-screenshots.mts` (screenmap-style):
   a `<target>.diff.png` with changed regions tinted + boxed, plus `summary.json`
   with per-target verdicts (`changed %` / `unchanged`).
4. **Uploads to Cloudinary** (the uploader `/pr-screenshots` already uses) and
   **fills the `## Screenshots` block** in the PR body file — a Target | Before |
   After | Diff table with the URLs, cell-level "unchanged"/"changed (N%)" notes.

```sh
# build the body from the template, then:
ios/scripts/pr-screenshots.sh --body-file /tmp/pr-body.md   # fills or strips ## Screenshots
gh pr create --body-file /tmp/pr-body.md
```

`--base <ref>` defaults to `main` (falls back to `origin/main`, then after-only).
Cloudinary absent → captures stay on disk and the body notes the paths (degraded,
not blocked — the exit code stays 0 so the PR still opens).

**CI enforces this.** `.github/workflows/ios-screenshots-gate.yml` is a standalone
workflow whose `paths` filter is the scoping: it triggers only when a PR touches
`ios/Depth/**`, minus `ios/Depth/Domain/**` (pure model types and pure logic) and
`ios/Depth/Data/**` (DTOs, mappers, repositories) — neither imports SwiftUI or declares a
View, so a diff confined to either cannot change a pixel. Any other PR (web, docs,
workflow-only) never provisions a runner for it at all; the check simply doesn't appear.
When it does run and the body has no real screenshot table (`![…](https://…)` images +
the end sentinel, or the degraded no-Cloudinary note), the job fails with instructions to
run `ios/scripts/pr-screenshots.sh` and push again. It never *captures* in CI (that was
the slow Action you deleted) — it only verifies the body over the API, with no checkout
at all, so it can't be forgotten and costs ~0 (no build, no macOS runner).

The still-relevant mechanics from the old workflow carry over unchanged:

- **Targets reach the runner via the scheme env var.** `xcodegen generate` + a
  `perl` patch bakes `SCREENSHOT_TARGETS` into the generated
  `Depth-PRScreenshots.xcscheme`'s TestAction env — the only channel that reliably
  reaches the XCUITest runner (DEP-280). A plain process env var to
  `xcodebuild test` does NOT reach it.
- **Why the dedicated scheme.** The default `Depth` scheme's `skippedTests` can't be
  overridden by `-only-testing`, so `Depth-PRScreenshots` is the parallel scheme that
  keeps the capture out of main CI while staying directly invocable.
- **Cloudinary** uses the same non-secret unsigned preset as `/pr-screenshots`
  (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_UPLOAD_PRESET`), under a
  `pr-ios-screenshots/<repo>/<head-sha>` folder. External image URLs render in the
  PR body; data-URI images do not.

## Notes / caveats

- **Default capture stack is local, not production.** `screenshot-check.sh`/
  `pr-screenshots.sh` default to `-c Debug`, which reads the local `supabase start`
  stack (DEP-270) instead of production — start it first (`supabase start`) or the
  script fails loudly rather than capturing empty screens. Pass `-c Staging` to
  capture against production instead — same "Staging points at production" caveat as
  the App Store sequence (see that doc's `TODO(DEP-40 Lane B)`) applies when you do.
- **The "before" side is cached** by `(base ref sha, target)` under
  `ios/.pr-screenshots-cache/` (gitignored) — a re-run against an unchanged base skips
  the base build + sim entirely. `--recapture-base` forces a fresh capture.
- **Screenshots are for visual decision support, not pixel-perfect CI gates.** Treat "does
  it look right" as the signal, same as a Vercel preview URL.
- **Never commit the exported PNGs or the baseline cache.** They're scratch output in
  `ios/.pr-screenshots/` and `ios/.pr-screenshots-cache/` (both gitignored), uploaded
  to Cloudinary for the PR body — not source (same rule as
  `docs/ios-appstore-screenshots.md`).
- **Add targets by appending a token + a `if requested.contains(...)` block** in
  `PRScreenshotsUITests.swift`. Keep it to a handful of high-signal screens (YAGNI — don't
  enumerate every tab).
