# SDD ledger — plan: docs/superpowers/plans/2026-08-15-native-ios-visual-pass.md

## Pre-flight conflict scan

Spec: `../obsidian/Projects/depth/specs/2026-08-15-native-ios-visual-pass-design.md` (read in full before writing the plan).

Task-pair / shared-file table:

| Pair | Shared file/interface | What one produces vs. other consumes | Finding |
|---|---|---|---|
| Task 1 → Tasks 2–7 | `DesignTokens.Colors.*`, `.depthCard()` | Task 1 produces the token enums + `View.depthCard(dense:)`; every later task consumes them | Consistent — all six later tasks reference the exact names Task 1 defines. Clean. |
| Task 2 → Task 7 | `DepthChartFieldView` dot semantics / player-detail sheet | Task 2 corrects dot colors to `primary`/`secondary`; Task 7 styles `PlayerDetailView` — different files | Clean — plan notes Task 2 should land before Task 7 "if at all possible" but is not a hard dependency. |
| Task 2 (self) | `DepthChartFieldView.swift` | Background/markings edit must preserve `DepthChartFieldLayout.compute` usage from #378 untouched | Consistent — task text explicitly limits edits to background + dot color and forbids touching geometry call sites. |
| Task 5 (self) | `SettingsView.swift` accessibility identifiers | `Form` → `ScrollView` conversion must preserve `settings-*` identifiers exactly | Consistent — task text lists every identifier that must survive; `AuthUITests.testAnonymousUserCanOpenNativeSignIn` is the end-to-end guard. |
| All tasks | Global Constraint: "xcodegen generate after adding/removing any Swift file" | Tasks 1 and 2 add new Swift files; others modify existing | Clean — Tasks 1/2 regenerate; Tasks 3–7 add no new files. |
| All tasks | Fan-out topology | Tasks 3–7 all branch from Task 1's branch (`feat/ios-design-tokens-card-primitive`) | Consistent by plan design — "tasks 3–7 touch disjoint files and can be worked in any order, or in parallel, once Task 1 lands." |

**Self-consistency check per task:**
- Task 1: tests reference `DesignTokens.Colors.bg`/`accent`/`surfaceCard`/`Spacing`/`Radius` exactly as implemented; note `Color(hex:)` needed its access widened from `TeamListView.swift` (was `private`-scoped) to be usable from `Support/`.
- Task 2: `FieldMarkings` and the gradient replace only the documented background line; `slotDot` swaps `uiAccent` → `primary`/`secondary` + `readableTextOn(...)` per web's `PlayerDot.tsx`.
- Tasks 3–7: consume only tokens + `.depthCard()`; no signatures change; accessibility identifiers preserved (verified by UI tests).
- Task 8: docs-only, no code interfaces.

**Verdict:** scan clean. No rulings needed before dispatching Task 1.

---

Task 1: complete (PR #380, merged to main as `8a7a608`, review clean). `DesignTokens` enums + `View.depthCard(dense:)` + 5 pinning tests (`DesignTokensTests`). Deviation: plan's `-only-testing:DepthTests/DesignTokensTests` runs 0 tests (free-function swift-testing suites aren't addressable by filename) — module-level `-only-testing:DepthTests` discovers them; noted in task report.

Task 2: complete (PR #381, merged as `07a66b3`, review clean). `FieldMarkings.swift` + `DepthChartFieldView` gradient/markings/dot-color surgical edits on top of #378's geometry. Full `DepthUITests` green; geometry tests unchanged.

Task 3: complete (PR #382, merged as `e22ebe9`, review clean). `TeamListView`/`TeamSwitcherSheet` dark-surface styling, identifiers preserved.

Task 4: complete (PR #383, merged as `2f7b092`, review clean). `.tint(DesignTokens.Colors.accent)` on `TabView`; unselected-tab color left at system default (not controllable via public API) — known limitation noted in task report.

Task 5: complete (PR #384, merged as `282227c`, review clean). `SettingsView` `Form` → `ScrollView` + `.depthCard()` sections; all `settings-*` identifiers survive (`AuthUITests` green).

Task 6: complete (PR #385, merged as `b690227`, review clean). `CompareView` placeholder wrapped in `.depthCard()`.

Task 7: complete (PR #386, merged as `eb9645f`, review clean). `PlayerDetailView` `.thinMaterial` → `.depthCard(dense: true)`, accessibility-size logic untouched.

Task 8: complete (docs checkoff — this ledger + plan checkboxes + vault spec status, one commit).

## Merge note (2026-08-16)

All seven PRs merged as a conventional bottom-up squash sequence (#380 → main, then #381–#386 retargeted to main and merged in any order), matching the plan's fan-out design rather than GitHub's formal Stacked PRs feature. GitHub's Stacks API requires a strict linear chain (each PR's base ref must equal the previous PR's head ref); our six dependents share one base, so they cannot form a single formal stack — and the atomic all-or-nothing stack merge would be strictly worse for seven independent PRs anyway. Merge mechanics: after #380 merged and `feat/ios-design-tokens-card-primitive` was deleted, GitHub auto-closed the six dependents; the base branch was recreated at main's HEAD, the PRs reopened, retargeted to `main`, then squash-merged. All checks green before merge.

## Follow-on, shipped after the plan

- CI matrix reduction (`.github/workflows/ios-ci.yml`, merged separately after the plan's PRs): dropped the "oldest-supported" simulator leg — simulator timing doesn't measure real-hardware performance, so the second leg added wall time without signal for a pre-launch side project. Single current-flagship leg now runs the full unit + UI suite; `archive-secret-check` unchanged.

## Post-ship review (Cooper)

Human visual pass on the shipped screens is still outstanding per the spec's Testing section — screenshots were attached to each task's report but a vision-capable reviewer has not yet certified them. See the plan's Task 8 and the vault spec's Testing section.