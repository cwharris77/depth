# Handoff brief — native iOS visual pass (2026-08-15) done; here's what's next

**For the next agent:** this is a short orientation, not a spec. Read the vault's
[[2026-08-15-native-ios-remaining-work-handoff]] for the full remaining-work inventory. This brief covers
what just shipped and the immediately actionable next steps.

## What's done (merged to `main`)

The entire native iOS visual pass shipped as seven squash-merged PRs:

| PR | Change |
|---|---|
| #380 | `DesignTokens` (token enums) + `.depthCard()` primitive + 5 pinning tests |
| #381 | Depth-chart field: real green gradient surface + yard-line/hash/end-zone markings + `primary`/`secondary` dot colors |
| #382 | Team switcher sheet: dark-surface card rows |
| #383 | Tab bar `.tint(accent)` (unselected-tab color left at system default — public-API limitation) |
| #384 | Account/Settings: `Form` → `ScrollView` + `.depthCard()` sections |
| #385 | Compare placeholder wrapped in card |
| #386 | Player detail sheet: `.thinMaterial` → `.depthCard(dense:)` |

New files: `ios/Depth/Support/DesignTokens.swift`, `ios/Depth/Support/Card.swift`, `ios/Depth/Features/TeamDetail/FieldMarkings.swift`, `ios/DepthTests/DesignTokensTests.swift`. DEP-207's geometry/dead-space fix was already in by #378.

**Merge mechanics worth knowing:** all six dependents branched from #380's branch (fan-out, not a chain). After #380 merged and its branch was deleted, GitHub auto-closed the dependents — the base branch was recreated at `main` HEAD, PRs reopened and retargeted to `main`, then merged. GitHub's formal Stacked PRs feature was evaluated and deliberately **not** used: it requires a strict linear chain and an atomic all-or-nothing merge, which is wrong for independent fan-out PRs.

## Open in the working tree (not committed)

- `.github/workflows/ios-ci.yml` — drops the "oldest-supported" simulator leg, leaving a single current-flagship leg running the full unit+UI suite. Simulator timing doesn't measure real-hardware performance, so the second leg was pure wall time for a pre-launch side project. `archive-secret-check` unchanged. **Decide whether to commit this** (and whether to keep the one-line rationale comment wording).

## Outstanding gates on the shipped work

1. **Human visual verification (the real acceptance gate).** The spec's Testing section requires screenshots of all six screens reviewed by Cooper or a vision-capable model. Screenshots were attached to each task's report but never certified by a vision-capable reviewer — the current model has no image input. Cooper has the simulator open with the app installed; a visual once-over of the field surface, switcher sheet, tab bar, Account, Compare, and player detail would close this. (Also re-verify DEP-207's acceptance: no overlapping dots on ≥2 teams, all three units.)
2. **CI matrix decision above** (uncommitted `ios-ci.yml` edit).

## What's next (from the remaining-work handoff, items 2–4 — all unblocked)

1. **Compare's real comparison UI** — own spec, independent, no file overlap with the visual pass.
2. **Favorite-team startup tier** — small (uses `StartupTeam.swift`/`DepthChartsTab.swift` + a Supabase migration/write path); optional fast-follow.
3. **Manual accessibility audit (item 30's human half)** — VoiceOver/XXXL/reduced-motion/landscape on a **physical device**; a checklist a human runs, not an implementation plan. Should follow the visual pass (the spec sequenced it after this work for that reason).
4. Everything else in the handoff (Gate 0, T10 icon/branding, T11 submission, T12 cutover, uniform archive) is **blocked on external/human-only gates** — don't scope plans for them yet.

## Environment notes

- Verification: `xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' test` (find a booted sim via `xcrun simctl list devices | grep Booted`).
- `xcodegen generate` after adding/removing Swift files; never hand-edit `ios/Depth.xcodeproj` (CI enforces).
- Pre-commit hooks run `npm run lint` + `tsc --noEmit`.
- Staging xcconfig hits production Supabase; RLS/native-auth integration suites self-skip in CI (no Docker on runners).
- House workflow: one concern per PR, Conventional Commits (scope `ios`), squash-merge only, address Greptile before merging.