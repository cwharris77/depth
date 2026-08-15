# Task 9D: Deterministic screenshot automation

Part of T9 (CI and release QA) in `docs/superpowers/plans/2026-08-14-native-ios-app.md`, the
native iOS app implementation plan for the `depth` repo. T9A (macOS CI workflow) is merged to
`main` — build on top of current `main`. T9B (performance) and T9C (secret inspection) are
separate, unrelated PRs — don't wait for them, and don't touch the files they're likely to have
touched (`.github/workflows/ios-ci.yml`'s existing jobs, `ios/Depth/Support/` performance
signposts, `ios/scripts/`) beyond what this task genuinely needs.

## Read first

1. `AGENTS.md` at the repo root — house invariants (one concern per PR, role-and-constraint header
   comments, no unsolicited scope, Conventional Commits).
2. `ios/DepthUITests/DepthUITests.swift`, `AuthUITests.swift`, `ShareUITests.swift` — existing
   XCUITest patterns. Note the existing `UI_TESTING_RESET_STATE` launch argument
   (`ios/Depth/App/DepthApp.swift`) — your new launch mode follows the same shape (a launch
   argument the app checks at startup), not a new mechanism.
3. `ios/xcconfig/Staging.xcconfig` — screenshots run against the Staging config, which currently
   points at the **real production Supabase project** (no separate staging project exists yet —
   documented `TODO(DEP-40 Lane B)`). "Stable staging seed" therefore means: pick specific,
   already-stable production data (e.g. the Buffalo Bills, team id `bills` — already used as the
   stable fixture team throughout the existing UI test suite) rather than standing up new seed
   infrastructure, which is out of scope for this task.
4. `ios/Depth/Features/` — find the views for team search, depth chart, player detail, position-
   group reorder editing, and schedule/history or native share, to know what's actually reachable
   and what accessibility identifiers exist for XCUITest navigation (`grep -rn
   "accessibilityIdentifier" ios/Depth/Features/`).

## Spec text (verbatim, from the vault design spec's Screenshots and metadata section — you
cannot fetch the vault yourself)

> 35. Add a deterministic `AppStoreScreenshots` XCUITest launch mode backed by a stable staging
>     seed. It sets team, section, user state, dates, and animation behavior without exposing an
>     email or test secret.
> 36. Capture five portrait screenshots on a currently accepted 6.9-inch iPhone simulator at an
>     exact App Store Connect resolution. Keep raw screenshots unframed and without alpha;
>     optionally create separate tasteful marketing composites.
> 37. Use this screenshot sequence:
>
>     | # | Screen | Suggested caption |
>     | --- | --- | --- |
>     | 1 | Team selector/search | Every team. One clear depth chart. |
>     | 2 | Team depth chart | See every position at a glance. |
>     | 3 | Player detail | Know who's next. |
>     | 4 | Personal reorder editing | Make the chart yours. |
>     | 5 | Schedule/history or native share | Context beyond the lineup. |
>
> 38. Inspect every image at full size for clipping, stale data, placeholder artifacts, simulator
>     chrome, personal information, unlicensed assets, and inconsistent status-bar time.

Test Review section's relevant row:

> | Screenshot | deterministic staging state and five exact-size clean captures |

## What to build

1. A new launch argument, e.g. `UI_TESTING_APPSTORE_SCREENSHOTS`, checked in `DepthApp.swift`
   alongside the existing `UI_TESTING_RESET_STATE` check. When present:
   - Force a deterministic, signed-out state (screenshot #4 "personal reorder editing" needs an
     authenticated owner session to reach the real edit UI — read `ios/Depth/Features/Auth/` and
     `TeamDetail/` to see whether the reorder sheet is reachable/presentable in a signed-out
     preview/demo state, or whether it genuinely requires a real signed-in session. If it requires
     a real session, you cannot fabricate one without a test email/OTP — the spec explicitly says
     "without exposing an email or test secret". Investigate whether the app already has any
     signed-out-safe way to preview the reorder UI; if not, treat screenshot #4 as blocked on that
     gap, use your judgment on the closest deterministic alternative (e.g. capture the reorder
     sheet's read-only/unsaved-drag preview state if such a thing exists), and say exactly what you
     did and why in your report — don't silently substitute a different screen than the spec's
     sequence without flagging it).
   - Disable non-deterministic UI (loading shimmer timing races, animations) where practical —
     check for an existing "reduce motion"-style hook, or gate on `UIAccessibility.isReduceMotionEnabled`
     if the app already respects that; otherwise a launch-argument-driven "instant transitions" flag
     is acceptable as new, minimal code.
   - Pre-select team `bills` (or another single stable team — pick one and use it consistently
     across all five screenshots for a coherent capture sequence) via the same mechanism
     `UI_TESTING_RESET_STATE` uses to control starting state.
2. A new XCUITest file, e.g. `ios/DepthUITests/AppStoreScreenshotsUITests.swift`, with one test per
   screenshot (or one test that walks the full sequence and calls
   `XCTAttachment(screenshot:)`/`add(_:)` five times with `lifetime = .keepAlways` — check which
   pattern existing tests in this repo already use for capturing images, if any (see
   `ShareUITests.swift`, which already exercises image rendering) — prefer consistency with
   whatever's already there). Each screenshot must be captured with:
   - No simulator chrome (XCUITest's `XCUIScreen.main.screenshot()` or `app.screenshot()` captures
     the app content, not OS chrome — confirm which API this repo's Xcode/XCTest version supports
     and use it correctly).
   - No visible status-bar inconsistency if avoidable — note in your report if you found a way to
     normalize the status bar (e.g. `xcrun simctl status_bar override`) or if that's out of reach
     from within an XCUITest and needs a CI-side `simctl` step instead; either is acceptable, just
     be explicit about which you did.
3. Capture on **a currently-accepted 6.9-inch iPhone simulator** (check what's currently accepted
   by App Store Connect as of now — the newest Pro Max-class simulator available is the safe
   choice; confirm the exact pixel resolution matches Apple's published 6.9-inch requirement before
   finalizing, don't guess).
4. Write the five captured screenshots to a discoverable output location (XCTest attachments are
   the standard mechanism — they land in the `.xcresult` bundle; also add a short doc comment or
   `docs/`-adjacent note — check `docs/` conventions in this repo first, since specs/plans live in
   the vault but developer-facing reference docs belong in this repo per `AGENTS.md` — on how to
   extract them for actual App Store Connect upload, e.g. `xcrun xcresulttool export` usage). Do
   not commit the actual screenshot image files to the repo — they're a release artifact, not
   source.
5. This new UITest file should **not** be part of the default `ios-ci.yml` `test` job's regular run
   if it's meaningfully slower/flakier than the existing suite, or if it depends on state (a signed
   -in session) not safely available in CI. Use your judgment; if you exclude it from CI, say so
   explicitly and explain how it's meant to be run instead (a documented local command is fine for
   this generation-only, human-triggered workflow — App Store screenshot capture is not a
   correctness gate, it's a release-prep tool).

## Global constraints (from AGENTS.md / house style)

- **One concern per PR.** This PR is the screenshot launch mode + XCUITest suite only.
- New/changed files get role-and-constraint header comments.
- Regenerate the Xcode project after adding files: `cd ios && xcodegen generate`, confirm
  `git diff --exit-code -- ios/Depth.xcodeproj` is clean.
- **Verification**: run the full existing suite to confirm nothing regressed, plus your new
  screenshot test(s) standalone:
  ```
  xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
    -destination 'platform=iOS Simulator,id=<YOUR_BOOTED_SIM_ID>' test
  ```
  For the screenshot-specific run, use `-only-testing:DepthUITests/AppStoreScreenshotsUITests` (or
  your actual class name) against the specific 6.9-inch simulator you're targeting, and attach (in
  your report) confirmation that five screenshots were actually produced (e.g. via
  `xcrun xcresulttool` inspection of the resulting `.xcresult`, or a description of what you saw).
- **Conventional Commits**, scope `ios`. Branch name: descriptive, e.g.
  `feat/ios-appstore-screenshots`.
- Write `.superpowers/sdd/2026-08-14-native-ios-app/task-9d-screenshots-report.md` with what you
  built, the reorder-screenshot judgment call and why, and your test evidence. `git add -f` both
  this report and this brief file (`.superpowers/sdd/` is gitignored by default) so they land in
  your PR.
- **After implementing:** open a PR against `main`
  (`feat(ios): add deterministic App Store screenshot automation (T9D)`), house PR body shape
  (`## What`/`## Why`/`## Tests` + Claude Code footer). Wait for `ios-ci.yml` to go green and check
  for a Greptile review — fix real findings, then squash-merge (`gh pr merge --squash
  --delete-branch`) once green. You're authorized to merge autonomously per AGENTS.md.

## Report contract

Return: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED, the PR URL and merge commit SHA (if
merged), a one-line test summary, and any concerns — especially your judgment call on screenshot #4
(personal reorder editing) if the app doesn't have a signed-out-safe way to reach that UI.
