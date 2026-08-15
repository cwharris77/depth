# Task 9B: Performance metrics harness

Part of T9 (CI and release QA) in `docs/superpowers/plans/2026-08-14-native-ios-app.md`, the
native iOS app implementation plan for the `depth` repo. T9A (macOS CI workflow) is already
merged to `main` — build on top of the current `main`, not an older commit.

## Read first

1. `AGENTS.md` at the repo root (or `CLAUDE.md` if that's the file present) — house invariants,
   especially: `lib/`-style header comments on new modules, no unsolicited scope, Conventional
   Commits, one concern per PR.
2. `docs/superpowers/plans/2026-08-14-native-ios-app.md` — search for `T9` to see this task's
   place in the plan.
3. The vault design spec's Performance Review and Test Review sections — you cannot read the
   vault directly from this worktree; the exact required text is quoted in full below, so you do
   not need vault access for this task.
4. `ios/Depth/Data/CachingDepthRepository.swift`, `ios/Depth/Data/SupabaseDepthRepository.swift`,
   `ios/Depth/App/DepthApp.swift`, `ios/Depth/App/ContentView.swift` — the real code paths this
   task instruments.
5. `ios/DepthUITests/DepthUITests.swift` — existing UI test patterns and launch-argument
   conventions (`UI_TESTING_RESET_STATE` is an existing example in `DepthApp.swift`).

## Spec text (verbatim, from the vault design spec — you cannot fetch this yourself)

**Performance Review section:**

1. Replace the existing four-parallel-plus-player read path with one projected nested team
   snapshot; prohibit `select(*)` and track payload size. (Already done — `SupabaseDepthRepository`
   already does one projected query. No action needed here.)
2. Render cache first and refresh in the background. Keep no more than 32 team snapshots and no
   image blobs in SwiftData. (Already done in T5. No action needed here.)
3. Deduplicate per-team refresh tasks in the repository actor and cancel stale searches. (Already
   done in T5. No action needed here.)
4. Search the fixed team set locally. Debounce/cancel remote player search and apply a result
   limit. (Already done. No action needed here.)
5. **Add XCTest metrics and `os_signpost` around launch, query, decode, cache transaction, and
   first useful render.** — this is what Task 9B implements.
6. **Budgets on an iPhone XS/XR-class device: warm cached content <1 s, visible tap response
   <100 ms, projected snapshot p95 <1.5 s on good Wi-Fi and <3 s on constrained test networking,
   smooth scrolling without sustained frame drops or unbounded memory growth.** — these are the
   numbers your XCTest metric assertions/thresholds should target. iPhone XS/XR simulators are no
   longer creatable against current iOS runtimes (confirmed in T9A) — the CI workflow
   (`.github/workflows/ios-ci.yml`) already runs an "oldest-supported-class" simulator leg
   (currently resolves to iPhone SE 3rd-gen or similar) as the practical stand-in; your new
   performance tests should run on whatever simulator the existing verification command uses, no
   special device pinning needed.

**Test Review section — the relevant row:**

> | Performance | warm launch, snapshot request/decode/cache, scrolling, tap response, memory |

## What to build

1. Add `os_signpost` instrumentation to the real code paths (not test-only shims) at these points:
   - App launch → first useful render (in `DepthApp.swift` / `ContentView.swift` — signpost
     interval from app init to the first team-chart-visible moment, or the earliest reasonable
     proxy for "first useful render" given the current UI structure).
   - `SupabaseDepthRepository.teamSnapshot(teamId:)` — signpost interval around the network
     query + JSON decode.
   - `CachingDepthRepository` — signpost interval around the SwiftData cache read/write
     transaction (`CachedSnapshotStore`).
   Use a single `OSLog`/`OSSignposter` instance scoped appropriately (e.g. a `DepthSignposts`
   enum/struct in `ios/Depth/Support/`, following this repo's existing pattern of small
   role-scoped types in `Support/` — check what's already there first). Every new file needs a
   role-and-constraint header comment per house style.
2. Add an XCTest-based performance test suite (`ios/DepthUITests/` or a new `ios/DepthTests/` file
   — pick whichever fits the existing test organization; XCUITests can use
   `XCTOSSignpostMetric`/`XCTApplicationLaunchMetric`/`XCTMemoryMetric`/`XCTClockMetric` against a
   real running app, which is more meaningful than a unit test for this). Concretely:
   - A launch-performance test using `XCTApplicationLaunchMetric` (Apple's standard warm-launch
     metric) or a custom `XCTOSSignpostMetric` tied to your new "first useful render" signpost.
   - A test asserting your snapshot-query signpost falls within budget under `XCTClockMetric`
     wrapping a call through the repository (adapt to how existing tests exercise the repository
     — check `CachingDepthRepositoryTests.swift` and `TeamSnapshotMapperTests.swift` for the
     existing test-double/fixture pattern before inventing a new one).
   - A tap-response test if the existing XCUITest journey (`DepthUITests.swift`) can be adapted
     to measure interaction latency with `XCTOSSignpostMetric`/`XCTClockMetric` around a tap.
   Where a budget is genuinely hard to assert deterministically on CI hardware (e.g. exact p95
   under variable CI load), assert a generous-but-meaningful threshold and note in the test's
   header/report why the number was chosen — do not assert something so loose it's meaningless,
   and do not invent a flaky hard real-time assertion that will make CI red on noisy runners.
3. Do **not** add these to the CI-blocking `ios-ci.yml` job if they are likely to be flaky on
   shared CI hardware — check with the reviewer/report your judgment call either way. It's
   acceptable and expected for performance tests to run as part of the existing `xcodebuild test`
   invocation as long as they're stable; if they can't be made CI-stable, say so explicitly in your
   report rather than silently skipping them.

## Global constraints (from AGENTS.md / house style)

- **One concern per PR.** This PR is performance instrumentation + tests only. Do not touch CI
  workflow files, screenshot automation, or secret-inspection tooling — those are other tasks.
- **New modules get a role-and-constraint header comment.** No narration comments.
- Regenerate the Xcode project after adding/removing source files: `cd ios && xcodegen generate`
  — then confirm `git diff --exit-code -- ios/Depth.xcodeproj` is clean before committing (this is
  now enforced by CI too, from T9A).
- **Verification command** (exactly this, adjust the simulator id to one booted on your machine —
  `xcrun simctl list devices | grep Booted`, boot one if none is booted):
  ```
  xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
    -destination 'platform=iOS Simulator,id=<YOUR_BOOTED_SIM_ID>' test
  ```
  Run this and confirm it's green before opening the PR.
- **Conventional Commits**, scope `ios`. Branch name: descriptive, e.g.
  `feat/ios-performance-metrics` (not an auto-generated slug).
- Write `.superpowers/sdd/2026-08-14-native-ios-app/task-9b-performance-report.md` documenting
  what you built, why, and your test evidence (command + output summary). This file (and this
  brief) live under `.superpowers/sdd/`, which has a blanket `.gitignore` — you must
  `git add -f` both files so they land in your PR; do not skip this (a prior task on this same
  plan, T8, had its brief files silently omitted for weeks because this step was skipped).
- **After implementing:** open a PR against `main` titled per Conventional Commits (e.g.
  `feat(ios): add performance metrics harness (T9B)`), with a body following the house PR shape
  (`## What` / `## Why` / `## Tests`, ending with the Claude Code footer). Wait for GitHub Actions
  CI (`ios-ci.yml`, now on `main`) to go green on your PR, and check for a Greptile review comment
  — if Greptile flags a real (not false-positive) issue, fix it and push a follow-up commit with a
  one-line note in the PR, then squash-merge (`gh pr merge --squash --delete-branch`) once CI is
  green and findings are addressed. You are authorized to merge autonomously per this repo's
  AGENTS.md ("OK to create, modify, and merge PRs autonomously... never delete or force-push
  main").

## Report contract

Return: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED, the PR URL and merge commit SHA (if
merged), a one-line test summary, and any concerns (e.g. "asserted a looser latency threshold than
the spec number because CI hardware is noisy — see report for reasoning").
