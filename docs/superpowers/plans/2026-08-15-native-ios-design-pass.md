# Native iOS Design Pass Implementation Plan

> **Spec:** `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-design.md` (Milestone 3, item 29) + `../obsidian/Projects/depth/specs/2026-08-15-native-ios-remaining-work-handoff.md` (item 1)
> **QA:** `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-qa-plan.md`
> **Status:** Open

**Goal:** Apply the first design pass to the native iOS app: semantic Dynamic Type, adaptive system colors, 8-point spacing, 44×44 minimum controls, consistent cards, standard navigation/sheets/menus, restrained haptics, no meaning conveyed by color alone — and fix DEP-207 (overlapping OL dots + dead space below the field card).

**Locked decisions (do not relitigate):**
- This is **not** a web reskin. Native keeps adaptive system colors; team brand colors continue to come from `teams.colors` (nav-parity spec "Out of scope").
- Field visual styling (markings/gradient/hash marks) is explicitly a **separate** future spec — not this one. This pass fixes the field's *geometry* (DEP-207) only.

## Execution rules

- Verify with the full Staging suite on the booted simulator; every PR must also carry screenshots for Cooper's visual review (a text-only agent cannot self-certify a design pass).
- One concern per PR, Conventional Commits (scope `ios`), squash-merge only.
- `xcodegen generate` after adding/removing a Swift file; never hand-edit the project file.

## Tasks

- [x] **T1 (design-geometry)** — Fix DEP-207's two symptoms in `DepthChartFieldView.swift`:
  - Overlapping OL dots: dots currently render at a fixed 44×44pt. Extract a pure geometry helper that picks the largest dot size where no same-row pair is closer than `size + gap`, and re-spreads too-tight rows around their centroid. Keep the **44×44 tap target** (`.frame(minWidth: 44, minHeight: 44)` + `.contentShape`) — the visual dot shrinks, the hit target does not (web does the same: 30px visual, 44px hit-slop). `AccessibilityUITests.testCriticalPathRemainsUsableAtAccessibilityXXXL` asserts slot frame ≥ 44pt, so this must hold.
  - Dead space below the field: the field currently sizes via `.aspectRatio(1.4, .fit)`, capping it at ~264pt tall on a ~700pt viewport. Size it to fill the available height with `.containerRelativeFrame(.vertical)` in `TeamDetailView` instead.
  - Files: `ios/Depth/Features/TeamDetail/DepthChartFieldView.swift`, new `ios/Depth/Features/TeamDetail/DepthChartFieldLayout.swift`, `ios/Depth/Features/TeamDetail/TeamDetailView.swift`, `ios/DepthTests/DepthChartFieldLayoutTests.swift`.
  - Verify: unit tests prove no same-row pair overlaps at the field width; `xcodebuild ... test` green; screenshots of all three units.
- [x] **T2 (screen pass)** — Consistency polish on the always-reachable screens, roughly by usage:
  - Depth chart header/toolbar: confirm 44×44 controls (already present), spacing.
  - Team switcher sheet (`TeamSwitcherSheet.swift`/`TeamListView.swift`): standard sheet chrome (already), row spacing/checkmark treatment.
  - Tab bar (`RootTabView.swift`): standard iOS 18 `TabView` — verify labels/icons.
  - Account tab (`SettingsView.swift`): **rename the navigation title "Settings" → "Account"** to match the tab label (known #377 inconsistency). `AuthUITests`/`DepthUITests` reference `settings-about-*` identifiers, not the title, so this is safe.
  - Compare placeholder (`CompareView.swift`): `ContentUnavailableView` is already the standard idiom.
  - Player detail (`PlayerDetailView.swift`): vitals already use `.thinMaterial` cards; verify.
  - Files: `SettingsView.swift` and any found during review.
  - Verify: full suite green; screenshots.
- [x] **T3 (verification + evidence)** — Run the full `xcodebuild ... test` suite on the booted simulator, capture before/after screenshots of every touched screen, and update DEP-207.

## Completion gate

- [x] DEP-207 acceptance: on every unit, dots never touch/overlap (unit-proven at field width), field card fills a reasonable proportion of the screen.
- [x] Full Staging suite green on the booted simulator (132 unit + 15 UI + 2 other).
- [x] Screenshots captured for Cooper's visual sign-off (`/tmp/depth-shots/after-{offense,defense,special-teams}.png`).