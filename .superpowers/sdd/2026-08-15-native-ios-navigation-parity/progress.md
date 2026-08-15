# SDD ledger — plan: docs/superpowers/plans/2026-08-15-native-ios-navigation-parity.md

## Pre-flight conflict scan

Spec: `../obsidian/Projects/depth/specs/2026-08-15-native-ios-navigation-parity-design.md` (read in full before writing the plan).

Task-pair / shared-file table:

| Pair | Shared file/interface | What one produces vs. other consumes | Finding |
|---|---|---|---|
| Task 1 → Task 2 | `StartupTeam.resolve` / `StartupTeam.defaultTeamId` | Task 1 produces the signature `resolve(lastTeamId:validIds:defaultId:)`; Task 2's `DepthChartsTab` calls `StartupTeam.resolve(lastTeamId:)` (defaults) and `StartupTeam.resolve(lastTeamId:validIds:)` (defaults for `defaultId`) | Consistent — Task 2's two call sites use the default-parameter forms Task 1 defines. Clean. |
| Task 2 (self) | `ios/Depth/Features/Teams/TeamListView.swift` | Step 1 rewrites the top of the file; step 10 adds `team-row-\(team.id)` identifier references from UI tests | Consistent — identifier name unchanged from the original file, only the enclosing view changed. Clean. |
| Task 2 (self) | `ios/Depth/Features/TeamDetail/TeamDetailView.swift` | Step 3 adds `onOpenTeamSwitcher` param + principal toolbar item; step 9 adds a signpost call inside the same file's sibling view-model file, not this one | Consistent — no line-range overlap between the two edits (step 3 touches init/toolbar, step 9 touches `TeamDetailViewModel.swift`). Clean. |
| Task 2 (self) | `ios/Depth/Features/Settings/SettingsView.swift` | Step 6 deletes `AccountSettingsButton` and rewrites `dataSavedAt`/Data section; Task 2 step 7's `RootTabView` never references `AccountSettingsButton` | Consistent — no dangling reference to the deleted struct anywhere in the plan text. Clean. |
| Task 2 → Task 3 | `ios/DepthUITests/AppStoreScreenshotsUITests.swift`, `team-switcher-button`/`waitForDepthChart` | Task 2 introduces the `team-switcher-button` identifier and the `XCUIApplication.waitForDepthChart()` helper (step 10/11); Task 3 step 1 consumes both | Consistent — Task 3's brief must carry these two names since its own task text doesn't redefine them. Noted for the Task 3 dispatch. |
| Task 2 → Task 3 | Screenshot #1 sequencing | Task 2 does not touch `AppStoreScreenshotsUITests.swift`; Task 3 is the only task that does | Clean — no overlap. |
| All tasks | Global Constraint: "No repository, cache, or query changes" | No task's steps touch `CachingDepthRepository`/`DepthRepository`/DTOs/mappers | Clean — verified by re-reading the Files list of every task. |
| All tasks | Global Constraint: "xcodegen generate after adding/removing any Swift file" | Task 1 step 4, Task 2 step 13 both regenerate | Clean. Task 3 adds no new Swift file (only modifies two existing files) — no regenerate step needed, correctly omitted. |

**Self-consistency check per task:**
- Task 1: tests reference `StartupTeam.resolve`/`StartupTeam.defaultTeamId` exactly as implemented in step 3. Clean.
- Task 2: every new type introduced in one step (`TeamListView`, `TeamSwitcherSheet`, `DepthChartsTab`, `CompareView`, `AccountTab`, `RootTabView`) is referenced with matching signatures by later steps that consume it (checked `RootTabView` step 7 against `DepthChartsTab`/`AccountTab` inits from steps 4/6 — parameter names match). Clean.
- Task 3: consumes identifiers/helpers only Task 2 defines — flagged above, not a conflict, just a cross-task dependency to carry into the dispatch.
- Task 4: docs-only, no code interfaces.

**Verdict:** scan clean. No rulings needed before dispatching Task 1.

---

Task 1: complete (commits 525ec4d..73da9ed, review clean)

Task 2: review — spec ✅, task quality: issues found (1 Important, 4 Minor). Controller independently ran `xcodebuild ... build` and confirmed BUILD SUCCEEDED before dispatching review (SourceKit diagnostics during implementation were stale-index noise, not real errors).
Task 2: minor (deferred): UITestHelpers.swift:38 waitForDepthChart() after team switch can match the outgoing team's still-mounted slots — doc claim stronger than what's verified.
Task 2: minor (deferred): player-slot predicate triplicated across UITestHelpers.swift:11, PerformanceUITests.swift:24-25, DepthUITests.swift:~86 — brief-specified, AGENTS.md #17 shape.
Task 2: minor (deferred): plan doc (971 lines) lands inside this commit per brief Step 15's `git add ios docs` — not a correctness issue, noting for Task 4.
Task 2: minor (deferred): SettingsView.swift:66 uses `SavedOnDeviceLabel(cachedAt: Date())` as throwaway redaction filler while loading — brief-specified, accessibilityHidden, cosmetic.
Task 2: fix round 1/5 dispatched — Important finding: UITestHelpers.swift:33-36's `XCTAssertFalse(otherElements["team-switcher-sheet"].waitForExistence(timeout: 3))` is likely vacuous (NavigationStack's accessibilityIdentifier probably never surfaces as an otherElements match, same root cause as the CompareView deviation) — the "switcher dismissed" assertion may pass regardless of actual dismissal, and the `team-switcher-sheet` identifier the brief lists as a produced interface goes unexercised by any test.
Task 2: fix round 1/5 (1 addressed via investigation, 0 open; no new commit — bd0c0e1 unchanged). Implementer instrumented the accessibility tree and confirmed `otherElements["team-switcher-sheet"]` resolves true while presented / false after dismissal — the assertion is load-bearing, not vacuous. Verified by deliberately breaking real dismissal (removed `dismiss()`) and observing the assertion fail, then restoring it and observing it pass. Full DepthUITests suite (11 tests) re-run and green.
Task 2: Ruling: no scoped re-review dispatched for this round — there is no diff to re-review (working tree identical to bd0c0e1), and the implementer's direct empirical verification (break → red, restore → green) is stronger evidence than a reviewer re-reading an unchanged diff. Adjudicated directly by the controller. Cost if wrong: the `team-switcher-sheet` dismissal check would be silently non-functional in CI — low risk given the instrumented proof, and `waitForDepthChart()` immediately after in the same helper would still catch the far more likely failure mode (chart never re-rendering).
Task 2: complete (commits 73da9ed..bd0c0e1, 1 Important addressed via investigation, 4 Minor parked/deferred)

Task 3: complete (commits bd0c0e1..986546c, review clean)
