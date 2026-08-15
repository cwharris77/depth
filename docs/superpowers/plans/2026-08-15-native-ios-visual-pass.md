# Native iOS Visual Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the website's actual dark-theme tokens to the native iOS app (currently zero design tokens, zero shared UI primitives) and give the depth-chart field a real visual surface (gradient + markings) on top of its already-fixed geometry.

**Status update (2026-08-15):** DEP-207's overlap/dead-space bug — originally this plan's Task 2 — was fixed and merged separately as depth#378 while this plan was being written, by a different session working from an earlier (since-corrected) version of the spec's language. That fix is good engineering (a pure, unit-tested geometry helper, not a hardcoded size) and is kept as-is. Task 2 below was rewritten to layer the still-missing dark-theme/markings work on top of #378's code rather than redoing it. See DEP-207's ticket and the vault spec's header for the full account.

**Architecture:** A new `ios/Depth/Support/DesignTokens.swift` ports `components/ui/tokens.ts`'s literal color/spacing/radius values; a new `.depthCard()` view modifier mirrors `components/ui/Card.tsx`. `DepthChartFieldView` (whose dot-overlap/dead-space geometry is already fixed by #378's `DepthChartFieldLayout`) gets a real green field surface (gradient + yard-line/hash-mark/end-zone markings ported from `FieldMarkings.tsx`) in place of its flat tinted rect, and dot colors corrected to `primary`/`secondary` (matching web's `PlayerDot.tsx`) in place of `uiAccent`. Every other screen (switcher sheet, tab bar, account, compare placeholder, player detail) gets tokens + the Card primitive applied on top of its existing structure — no interaction/IA changes anywhere in this plan.

**Tech Stack:** Swift 6, SwiftUI (iOS 18), Swift Testing, XCUITest, XcodeGen.

**Spec:** `../obsidian/Projects/depth/specs/2026-08-15-native-ios-visual-pass-design.md` — read it in full before starting. Its "Locked Decisions" section is settled; do not relitigate it. In particular: always dark (no light-mode work), literal token values (not reinterpreted), semantic Dynamic Type text styles (never raw `.system(size:)`).

## Global Constraints

- **Always dark.** No `@Environment(\.colorScheme)` branching, no light-palette work anywhere in this plan.
- **Literal token values only.** Every hex/spacing/radius value in this plan is copied from `components/ui/tokens.ts` / `Card.tsx` as cited in the spec — do not adjust any value "for native contrast."
- **Semantic Dynamic Type.** Every font in code touched by this plan uses a named SwiftUI text style (`.caption2`, `.caption`, `.footnote`, `.subheadline`, `.headline`, etc.) per the spec's type-scale table — never `.system(size:)`.
- **Styling only — no IA/interaction changes.** If implementing a task reveals what looks like a genuine information-architecture problem, stop and flag it in the task report rather than fixing it inline.
- **`xcodegen generate` after adding or removing any Swift file.** Never hand-edit `ios/Depth.xcodeproj`. CI enforces this with `git diff --exit-code`.
- **Every new/changed module carries a role-and-constraint header comment** (AGENTS.md §3). Preserve existing comments through edits — several files touched by this plan (`DepthChartFieldView.swift`, `TeamListView.swift`, `SettingsView.swift`) have load-bearing comments explaining prior decisions; don't delete them, extend them.
- **Visual verification is mandatory, not optional.** Per the spec's Testing section, no task in this plan is complete on green CI alone — every task that changes a screen's appearance requires a real screenshot (via the iOS Simulator) attached to its report, showing the token colors/Card treatment are actually visible. This is called out per-task below; do not skip it because "the code compiles."
- **Conventional Commits**, scope `ios`. Squash-merge only. Address Greptile's initial review before merging.
- **Verification command** (find a booted simulator with `xcrun simctl list devices | grep Booted`):

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' test
```

## PR boundaries

| Task | PR | Why it is its own PR |
| --- | --- | --- |
| 1 | `feat(ios): add design tokens and Card primitive` | Foundation. No screen changes yet — safe, reviewable in isolation, everything else depends on it. |
| 2 | `feat(ios): render the depth-chart field as a real field surface` | Geometry/overlap fix already shipped separately as depth#378 — this PR only adds the gradient/markings/dot-color layer on top of it. |
| 3 | `feat(ios): apply card styling to the team switcher sheet` | Isolated to `TeamSwitcherSheet.swift`/`TeamListView.swift`. |
| 4 | `feat(ios): tint the tab bar with the app accent color` | One line of substance; its own PR because it's a different file (`RootTabView.swift`) with no other changes needed. |
| 5 | `feat(ios): apply card styling to the Account screen` | Isolated to `AccountTab.swift`/`SettingsView.swift`. The "Account tab vs Settings title" inconsistency from #377 was already fixed by depth#378 — this PR is styling only. |
| 6 | `feat(ios): apply card styling to the Compare placeholder` | One file, `CompareView.swift`. |
| 7 | `feat(ios): apply card styling to the player detail sheet` | Isolated to `PlayerDetailView.swift`. |
| 8 | `docs(ios): check off native iOS visual pass` | Plan checkboxes + SDD ledger + vault spec status, per house convention. |

Tasks 3–7 touch disjoint files and can be worked in any order, or in parallel, once Task 1 lands. Task 2 should land before Task 7 if at all possible (both touch color/dot logic conceptually, though not the same file) but is not a hard dependency.

---

### Task 1: Design tokens and Card primitive

**Files:**
- Create: `ios/Depth/Support/DesignTokens.swift`
- Create: `ios/Depth/Support/Card.swift`
- Test: `ios/DepthTests/DesignTokensTests.swift`

**Interfaces:**
- Consumes: nothing.
- Produces: `enum DesignTokens` with nested `Colors`, `Spacing`, `Radius` enums (e.g. `DesignTokens.Colors.bg`, `DesignTokens.Spacing.md`, `DesignTokens.Radius.lg`) — every later task in this plan references these exact names. Also produces `View.depthCard(dense: Bool = false) -> some View`.

- [ ] **Step 1: Write the failing tests**

Create `ios/DepthTests/DesignTokensTests.swift`:

```swift
import Testing
import SwiftUI
@testable import Depth

// Token values are a literal port of components/ui/tokens.ts — these tests pin the
// values against that source so a future edit can't silently drift from web without a
// test failing. Not exhaustive color-by-color; spot-checks the values most likely to be
// "close but wrong" (transcription errors) rather than re-deriving every hex.
@Test func backgroundTokenMatchesWebTokensTs() {
    #expect(DesignTokens.Colors.bg == Color(hex: "#0a0e1a"))
}

@Test func accentTokenMatchesWebTokensTs() {
    #expect(DesignTokens.Colors.accent == Color(hex: "#69BE28"))
}

@Test func surfaceCardTokenMatchesWebTokensTs() {
    #expect(DesignTokens.Colors.surfaceCard == Color(hex: "#0f1623"))
}

@Test func spacingScaleIsAnEightPointFamily() {
    #expect(DesignTokens.Spacing.xs == 4)
    #expect(DesignTokens.Spacing.sm == 8)
    #expect(DesignTokens.Spacing.md == 16)
    #expect(DesignTokens.Spacing.lg == 24)
    #expect(DesignTokens.Spacing.xl == 32)
}

@Test func radiusScaleMatchesWebsCardRadius() {
    #expect(DesignTokens.Radius.sm == 12)
    #expect(DesignTokens.Radius.lg == 24)
}
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthTests test
```

Expected: compile failure — `cannot find 'DesignTokens' in scope`.

- [ ] **Step 3: Write `DesignTokens.swift`**

```swift
import SwiftUI

// Literal port of components/ui/tokens.ts's `colors` object, plus a spacing and corner-
// radius scale (2026-08-15 visual-pass spec, locked decision #2: "literal token port,
// not reinterpretation"). Every color value here must match tokens.ts exactly — if the
// web file changes, update this file by hand; there is no shared build-time generation
// between the two (unlike the domain/formations fixtures, which do have one). Only
// tokens with a current native call site are ported — add more here when a screen
// actually needs one, not speculatively (YAGNI).
enum DesignTokens {
    enum Colors {
        static let bg = Color(hex: "#0a0e1a")
        static let textPrimary = Color(hex: "#f0f4ff")
        static let textSecondary = Color(hex: "#dfe5f0")
        static let textMuted = Color(hex: "#A5ACAF")
        static let textFaint = Color(hex: "#7d848c")
        /// The app's own UI accent (link colors, focus rings, tab-bar tint) — never
        /// team-specific. Distinct from any team's `uiAccent`.
        static let accent = Color(hex: "#69BE28")
        static let onAccent = Color(hex: "#0a0e1a")
        static let danger = Color(hex: "#ff6b6b")
        static let surfaceCard = Color(hex: "#0f1623")
        static let surfaceCard2 = Color.white.opacity(0.03)
        static let borderDefault = Color.white.opacity(0.08)
        static let borderSubtle = Color.white.opacity(0.06)
        /// Used by the depth-chart field's yard lines.
        static let borderStrong = Color.white.opacity(0.10)
    }

    /// 8-point spacing scale (design-pass item 29's explicit requirement).
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 12
        /// Matches web's `Card.tsx` (`rounded-3xl`).
        static let lg: CGFloat = 24
        static let full: CGFloat = 999
    }
}
```

Note: this file depends on `Color(hex:)`, currently defined as a `private`-adjacent extension at the bottom of `ios/Depth/Features/Teams/TeamListView.swift`. Check its current accessibility level — if it's not already usable from `Support/`, widen its access level (e.g. remove any `fileprivate`/fold it into `internal`) rather than duplicating the hex-parsing logic in this new file. Do not copy-paste the parser.

- [ ] **Step 4: Write `Card.swift`**

```swift
import SwiftUI

// Native equivalent of components/ui/Card.tsx (2026-08-15 visual-pass spec) — the one
// bounded-surface treatment every screen in the app composes from, rather than each
// screen inventing its own background/border/radius combination.
private struct DepthCard: ViewModifier {
    let dense: Bool

    func body(content: Content) -> some View {
        content
            .padding(DesignTokens.Spacing.md)
            .background(dense ? DesignTokens.Colors.surfaceCard2 : DesignTokens.Colors.surfaceCard)
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .strokeBorder(DesignTokens.Colors.borderDefault, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }
}

extension View {
    /// Wraps content in the app's one card treatment. `dense: true` uses the lighter
    /// `surfaceCard2` fill (web's `Card` `dense` prop) for nested/secondary surfaces.
    func depthCard(dense: Bool = false) -> some View {
        modifier(DepthCard(dense: dense))
    }
}
```

- [ ] **Step 5: Regenerate the Xcode project and run the tests**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthTests test
```

Expected: PASS, all 5 new tests green.

- [ ] **Step 6: Visual smoke check**

This task adds no visible UI on its own (nothing calls `.depthCard()` yet), so there's nothing to screenshot — confirm the app still launches and looks unchanged from before this task (quick `xcrun simctl launch` + one screenshot is enough evidence for the report; a full diff isn't meaningful here since nothing visible changed).

- [ ] **Step 7: Commit**

```bash
git add ios/Depth/Support/DesignTokens.swift ios/Depth/Support/Card.swift ios/DepthTests/DesignTokensTests.swift ios/Depth.xcodeproj
git commit -m "feat(ios): add design tokens and Card primitive"
```

---

### Task 2: Depth-chart field visual treatment (dark surface + markings, on top of the already-shipped geometry fix)

**Superseded from the original plan (read before starting):** DEP-207's actual overlap/dead-space bug was fixed and merged separately as depth#378, *before* this task was implemented — a different session picked it up in parallel. That PR added `ios/Depth/Features/TeamDetail/DepthChartFieldLayout.swift` (a pure, unit-tested geometry helper that computes a safe dot size and position per slot) and rewired `DepthChartFieldView.swift` to consume it, plus sized the field via `.containerRelativeFrame(.vertical)` in `TeamDetailView.swift`. That work is **good and already shipped — do not redo it, do not revert `DepthChartFieldLayout.swift`, do not reintroduce a fixed dot size.** This task now does only what's actually still missing per the spec: the field still renders as a flat light-blue-tinted rounded rect (no gradient, no yard lines/hash marks/line-of-scrimmage) and the dots still fill with `uiAccent` instead of the spec's `primary`/`secondary` semantics. Both of those are layered on top of #378's code, not a rewrite of it.

**Files:**
- Create: `ios/Depth/Features/TeamDetail/FieldMarkings.swift`
- Modify: `ios/Depth/Features/TeamDetail/DepthChartFieldView.swift` (background + dot color only — leave the geometry/`DepthChartFieldLayout` usage exactly as #378 left it)

**Interfaces:**
- Consumes: `DesignTokens.Colors.borderStrong` (Task 1), `readableTextOn(_:)` (existing, `ios/Depth/Domain/ReadableText.swift`), `DepthChartFieldLayout.compute(slots:fieldSize:)` (existing, from #378 — unchanged).
- Produces: no new public interface — `DepthChartFieldView`'s existing `init(snapshot:unit:onSelectPlayer:)` signature is unchanged. `FieldMarkings` is a new private-to-the-feature `View`.

- [ ] **Step 1: Read the current file first**

Read `ios/Depth/Features/TeamDetail/DepthChartFieldView.swift` as it exists on `main` right now (post-#378) — it already differs from what any earlier version of this plan may have described. In particular, `body` already computes `let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: proxy.size)` and positions dots via `layout.positions[slot.key]` with `layout.dotSize` — keep all of that. The only two things this task touches are (a) the `RoundedRectangle(cornerRadius: 16).fill(Color(hex: snapshot.team.colors.primary).opacity(0.15))` background line, and (b) `slotDot`'s `Circle().fill(Color(hex: snapshot.team.colors.uiAccent))` line plus its number/questionmark color.

- [ ] **Step 2: Create `FieldMarkings.swift`**

Direct port of `components/FieldMarkings.tsx`'s SVG geometry (all coordinates are percentages of the field's bounds):

```swift
import SwiftUI

// Direct port of components/FieldMarkings.tsx's SVG geometry (2026-08-15 visual-pass
// spec) — yard lines, end zones, line of scrimmage, and hash marks, all as percentages
// of the field's own bounds so they scale with whatever size DepthChartFieldView ends
// up rendering at.
struct FieldMarkings: View {
    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height

            ZStack {
                // Yard lines every 10%, skipping the 50% line (drawn separately, below,
                // as the line of scrimmage).
                ForEach([10, 20, 30, 40, 60, 70, 80, 90], id: \.self) { yPercent in
                    Path { path in
                        let y = h * CGFloat(yPercent) / 100
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: w, y: y))
                    }
                    .stroke(DesignTokens.Colors.borderStrong, lineWidth: h * 0.004)
                }

                // End zones.
                Rectangle()
                    .fill(Color(red: 0, green: 34 / 255, blue: 68 / 255).opacity(0.3))
                    .frame(width: w, height: h * 0.06)
                    .position(x: w / 2, y: h * 0.03)
                Rectangle()
                    .fill(Color(red: 0, green: 34 / 255, blue: 68 / 255).opacity(0.3))
                    .frame(width: w, height: h * 0.06)
                    .position(x: w / 2, y: h * 0.97)

                // Line of scrimmage — solid blue, matching TV broadcast overlays (same
                // comment as the web source).
                Path { path in
                    let y = h * 0.5
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: w, y: y))
                }
                .stroke(Color(hex: "#2d6fe0"), lineWidth: h * 0.006)

                // Hash marks — two columns, one per side of the field.
                ForEach([15, 25, 35, 45, 55, 65, 75, 85], id: \.self) { yPercent in
                    let y = h * CGFloat(yPercent) / 100
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.32, y: y))
                        path.addLine(to: CGPoint(x: w * 0.35, y: y))
                    }
                    .stroke(Color.white.opacity(0.12), lineWidth: h * 0.004)
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.65, y: y))
                        path.addLine(to: CGPoint(x: w * 0.68, y: y))
                    }
                    .stroke(Color.white.opacity(0.12), lineWidth: h * 0.004)
                }
            }
        }
        .allowsHitTesting(false)
    }
}
```

Note: `Color.white.opacity(0.12)` for the hash marks is a deliberate one-off (matches web's `surfaceChipHover`, which isn't in the Task 1 token table since it has no other native call site — per the spec, don't port the whole `surfaceChip*` family for this single use).

- [ ] **Step 3: Patch `DepthChartFieldView.swift` — background and dot color only**

Do not rewrite this file wholesale. Make exactly these two surgical edits to the file as it exists post-#378:

1. In `body`, replace the single line

   ```swift
   RoundedRectangle(cornerRadius: 16)
       .fill(Color(hex: snapshot.team.colors.primary).opacity(0.15))
   ```

   with:

   ```swift
   LinearGradient(
       colors: [Color(hex: "#1e3d10"), Color(hex: "#2d5a1b"), Color(hex: "#1e3d10")],
       startPoint: .top,
       endPoint: .bottom
   )
   .clipShape(RoundedRectangle(cornerRadius: 16))

   FieldMarkings()
       .clipShape(RoundedRectangle(cornerRadius: 16))
   ```

   (Two views now instead of one — both go inside the existing `ZStack`, ahead of the `ForEach(slots, ...)` that draws the dots. Leave the `ForEach` and everything below it in `body` untouched — `layout.positions`/`layout.dotSize` usage from #378 stays exactly as-is.)

2. In `slotDot(label:number:dotSize:)`, replace

   ```swift
   Circle()
       .fill(Color(hex: snapshot.team.colors.uiAccent))
       .overlay {
           if let number {
               Text(verbatim: "\(number)")
                   .font(.caption.bold())
                   .foregroundStyle(Color(hex: snapshot.team.colors.onAccent))
           } else {
               Image(systemName: "questionmark")
                   .font(.caption2)
                   .foregroundStyle(Color(hex: snapshot.team.colors.onAccent))
           }
       }
       .frame(width: dotSize, height: dotSize)
   ```

   with:

   ```swift
   Circle()
       .fill(Color(hex: snapshot.team.colors.primary))
       .overlay {
           Circle().strokeBorder(Color(hex: snapshot.team.colors.secondary), lineWidth: 2)
       }
       .overlay {
           if let number {
               // Verbatim: a jersey number is an identifier, not a quantity —
               // LocalizedStringKey interpolation would group it ("1,000"), the
               // same bug class already fixed for the season year elsewhere.
               Text(verbatim: "\(number)")
                   .font(.caption.bold())
                   .foregroundStyle(Color(hex: readableTextOn(snapshot.team.colors.primary)))
           } else {
               Image(systemName: "questionmark")
                   .font(.caption2)
                   .foregroundStyle(Color(hex: readableTextOn(snapshot.team.colors.primary)))
           }
       }
       .frame(width: dotSize, height: dotSize)
   ```

   `readableTextOn` returns a hex `String`, not a `Color` — `ios/Depth/Domain/ReadableText.swift`'s signature is `func readableTextOn(_ background: String) -> String`; the code above wraps it in `Color(hex:)` accordingly.

3. Extend the file's existing header comment (don't delete #378's paragraph about `DepthChartFieldLayout`/tap targets) with one more sentence noting the field now renders a real gradient+markings surface instead of a flat tint, and dots use `primary`/`secondary` instead of `uiAccent` — cite this plan/spec by date (2026-08-15 visual-pass).

Selection-state dot styling (a distinct look when a dot is the currently-selected player) does not exist in the current file at all — this task does not add it. If a future task wants that, it's new scope, not something this task quietly skipped.

- [ ] **Step 4: Regenerate, build, and run the existing geometry tests**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthTests/DepthChartFieldLayoutTests test
```

Expected: PASS, unchanged — this task doesn't touch `DepthChartFieldLayout.swift` or its 6 existing unit tests (from #378) at all; this run just confirms the surgical edits above didn't accidentally disturb the geometry call sites.

- [ ] **Step 5: Run the full existing DepthUITests suite**

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthUITests test
```

Expected: PASS. In particular confirm `AccessibilityUITests.testCriticalPathRemainsUsableAtAccessibilityXXXL`'s `XCTAssertGreaterThanOrEqual(playerSlot.frame.height, 44, ...)` assertion still passes — it should, since neither edit above touches the tap-target sizing #378 already fixed. If it fails on a full-suite run but passes when re-run in isolation (`-only-testing:DepthUITests/AccessibilityUITests`), that's the same simulator-contention flake seen repeatedly this session — not a real regression; note it in the report rather than chasing it.

- [ ] **Step 6: Visual verification (mandatory per Global Constraints)**

Launch the app in the simulator, navigate to a team's Offense unit, and take a screenshot. Confirm: (a) a real green field with visible yard lines/hash marks/line-of-scrimmage, not a flat tinted rectangle; (b) dots read as team-primary-colored with a secondary-colored ring, not the old flat `uiAccent` fill; (c) still no overlapping dots and the field still fills the screen (#378's fix, unaffected by this task — confirm it's still true, don't just assume). Repeat for Defense and Special Teams units on at least one other team. Attach all screenshots to the task report.

- [ ] **Step 7: Commit**

```bash
git add ios/Depth/Features/TeamDetail/FieldMarkings.swift ios/Depth/Features/TeamDetail/DepthChartFieldView.swift ios/Depth.xcodeproj
git commit -m "feat(ios): render the depth-chart field as a real field surface"
```

---

### Task 3: Team switcher sheet card styling

**Files:**
- Modify: `ios/Depth/Features/Teams/TeamSwitcherSheet.swift`
- Modify: `ios/Depth/Features/Teams/TeamListView.swift`

**Interfaces:**
- Consumes: `DesignTokens.Colors.*`, `.depthCard()` (Task 1). No signature changes to either file's existing `init`s.

- [ ] **Step 1: Apply tokens to `TeamListView.swift`**

Read the current file first. In the `.loaded` case's `List` (the team rows), wrap each row's content (currently `HStack { TeamRow(team: team); Spacer(); ... }`) with `.listRowBackground(DesignTokens.Colors.surfaceCard2)` and set `.scrollContentBackground(.hidden)` plus a `DesignTokens.Colors.bg` background on the `List` itself, so the switcher sheet reads as the app's dark surface rather than default `UITableView` gray. `TeamRow`'s text (`Text("\(team.city) \(team.name)")` / conference-division subtitle) moves onto the type scale: primary line `.subheadline`, secondary line `.caption`. `TeamRow`'s existing structure/spacing otherwise unchanged.

- [ ] **Step 2: Apply tokens to `TeamSwitcherSheet.swift`**

Read the current file first. Add `.presentationBackground(DesignTokens.Colors.bg)` to the sheet's outermost `NavigationStack` so the sheet's own chrome (nav bar, safe areas) matches the dark background rather than the system sheet default.

- [ ] **Step 3: Build and run the full DepthUITests suite**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthUITests test
```

Expected: PASS — no identifiers moved, this is a styling-only change.

- [ ] **Step 4: Visual verification**

Open the team switcher sheet in the simulator, screenshot it. Confirm the dark background, card-styled rows, and legible text at the new type-scale sizes. Attach to the task report.

- [ ] **Step 5: Commit**

```bash
git add ios/Depth/Features/Teams/TeamSwitcherSheet.swift ios/Depth/Features/Teams/TeamListView.swift
git commit -m "feat(ios): apply card styling to the team switcher sheet"
```

---

### Task 4: Tab bar accent tint

**Files:**
- Modify: `ios/Depth/App/RootTabView.swift`

**Interfaces:**
- Consumes: `DesignTokens.Colors.accent` (Task 1). No signature change.

- [ ] **Step 1: Add the tint**

In `ios/Depth/App/RootTabView.swift`, add `.tint(DesignTokens.Colors.accent)` to the `TabView` in `body`. If SwiftUI's `TabView`/`Tab` API on this iOS version doesn't expose a way to also recolor the *unselected* tab icon/label away from its system default, ship the tint change alone — do not reach for private API or a UIKit `UITabBar.appearance()` bridge to force it; note the unselected-color gap explicitly in the task report as a known limitation rather than working around it.

- [ ] **Step 2: Build and run the full DepthUITests suite**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthUITests test
```

Expected: PASS.

- [ ] **Step 3: Visual verification**

Screenshot the tab bar with each tab selected in turn, confirm the selected tab reads in the app's accent green rather than default iOS blue. Attach to the task report.

- [ ] **Step 4: Commit**

```bash
git add ios/Depth/App/RootTabView.swift
git commit -m "feat(ios): tint the tab bar with the app accent color"
```

---

### Task 5: Account/Settings card styling

**Already done, skip this step:** the "Account tab says Account, screen title says Settings" inconsistency this task originally planned to fix (`.navigationTitle("Settings")` → `.navigationTitle("Account")`) was already shipped by depth#378 in parallel with this plan — check the current file before assuming it's still `"Settings"`. Do not re-apply this change or fight over it in the diff; this task now only adds card styling on top.

**Files:**
- Modify: `ios/Depth/Features/Settings/SettingsView.swift`

**Interfaces:**
- Consumes: `DesignTokens.Colors.*`, `.depthCard()` (Task 1). No signature change — `AccountTab.swift` (which constructs `SettingsView`) is untouched.

- [ ] **Step 1: Move off `Form`'s default chrome**

Read the current file first. Replace the `Form { ... }` with a `ScrollView { VStack(spacing: DesignTokens.Spacing.md) { ... } .padding(DesignTokens.Spacing.md) }`, with each `Section`'s content (Account, About, Data, and the conditional sign-out-error block) becoming its own labeled group wrapped in `.depthCard()`. Preserve every existing `.accessibilityIdentifier` on the inner elements (`settings-about-name`, `settings-about-version`, `settings-about-disclaimer`, `settings-data-saved-at`, `settings-data-explanation`) exactly as-is — only the outer container changes, not what's inside it. Section headers (previously `Section("Account")` etc.) become plain `Text("Account")` styled `.caption` + `DesignTokens.Colors.textMuted`, placed above each card, matching web's section-label pattern.

- [ ] **Step 2: Set the screen and sheet backgrounds**

Add `DesignTokens.Colors.bg` as the `ScrollView`'s background and `.presentationBackground(DesignTokens.Colors.bg)` on each of the two `.sheet()`s this view presents (`AuthSheet`, `AccountDeletionSheet`) so they don't revert to system white/default when opened from this screen. (Those sheets' own internal content is out of scope for this task — only the presentation background.)

- [ ] **Step 3: Build and run the affected tests**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthUITests/AuthUITests -only-testing:DepthTests/SettingsAboutAndTimestampTests test
```

Expected: PASS. `AuthUITests.testAnonymousUserCanOpenNativeSignIn` in particular exercises most of this screen's identifiers end-to-end — if it fails, an identifier was dropped during the `Form` → `ScrollView` conversion; find and restore it rather than editing the test.

- [ ] **Step 4: Visual verification**

Screenshot the Account tab (both signed-out and, if feasible in the simulator, signed-in states) and confirm card-styled sections on the dark background. Attach to the task report.

- [ ] **Step 5: Commit**

```bash
git add ios/Depth/Features/Settings/SettingsView.swift
git commit -m "feat(ios): apply card styling to the Account screen"
```

---

### Task 6: Compare placeholder card styling

**Files:**
- Modify: `ios/Depth/Features/Compare/CompareView.swift`

**Interfaces:**
- Consumes: `DesignTokens.Colors.*`, `.depthCard()` (Task 1). No signature change.

- [ ] **Step 1: Apply card styling**

Read the current file first. Wrap the `ContentUnavailableView` in `.depthCard()` with some horizontal padding so it reads as an intentional card-based empty state rather than a bare system placeholder, and set `DesignTokens.Colors.bg` as the `NavigationStack`'s background. Keep the existing `.accessibilityElement(children: .combine)` / `.accessibilityIdentifier("compare-placeholder")` / `.navigationTitle("Compare")` exactly as they are — this task changes visual chrome only.

- [ ] **Step 2: Build and run the full DepthUITests suite**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthUITests test
```

Expected: PASS — `DepthUITests.testTabBarReachesAllThreeDestinations` exercises this screen's identifier; confirm it still passes unchanged.

- [ ] **Step 3: Visual verification**

Screenshot the Compare tab, confirm the "coming soon" state now reads as an intentional card rather than a bare placeholder. Attach to the task report.

- [ ] **Step 4: Commit**

```bash
git add ios/Depth/Features/Compare/CompareView.swift
git commit -m "feat(ios): apply card styling to the Compare placeholder"
```

---

### Task 7: Player detail sheet card styling

**Files:**
- Modify: `ios/Depth/Features/TeamDetail/PlayerDetailView.swift`

**Interfaces:**
- Consumes: `DesignTokens.Colors.*`, `.depthCard()` (Task 1). No signature change.

- [ ] **Step 1: Replace the two `.thinMaterial` backgrounds with `.depthCard()`**

Read the current file first. Two spots currently use `.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))`: the `vital(_:_:)` helper (vitals grid tiles) and `PlayerStatsTable`'s outer `VStack` (the stats table). Replace both with `.depthCard(dense: true)` — the tighter, secondary-surface variant, since these are nested inside the sheet's own content rather than being the sheet's primary surface. `PlayerStatsSkeleton` (the loading-state placeholder, sized against the same `@ScaledMetric`s as the real table per AGENTS.md's flash-then-jump rule) gets the same `.depthCard(dense: true)` treatment so it doesn't visibly resize once real content replaces it.

- [ ] **Step 2: Apply the sheet's own background**

Add `.presentationBackground(DesignTokens.Colors.bg)` to the `NavigationStack` in `body`, and move the `header`/`vitals`/stats section title (`Text("Season Stats").font(.headline)`) and any other bare text in this file onto the type scale (`.headline` for the section title is already correct per the spec's table — leave it; check `labeledText`'s label `Text(label).font(.caption.bold())` and update to `.caption` per the scale if `.caption.bold()` isn't already equivalent).

- [ ] **Step 3: Build and run the full DepthUITests suite**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthUITests test
```

Expected: PASS — `DepthUITests.testLaunchesIntoAChartThenSwitchesTeamAndOpensPlayerDetail` and `AccessibilityUITests.testCriticalPathRemainsUsableAtAccessibilityXXXL` both open this sheet; confirm both still pass, including the accessibility-size assertions (this task must not touch the existing `@ScaledMetric`/`dynamicTypeSize.isAccessibilitySize` logic from T10 — verify none of it was accidentally altered).

- [ ] **Step 4: Visual verification**

Open a player detail sheet in the simulator, screenshot it. Confirm the vitals tiles and stats table read as cards on the dark background rather than default `.thinMaterial`. Attach to the task report.

- [ ] **Step 5: Commit**

```bash
git add ios/Depth/Features/TeamDetail/PlayerDetailView.swift
git commit -m "feat(ios): apply card styling to the player detail sheet"
```

---

### Task 8: Documentation and ledger

**Files:**
- Modify: `docs/superpowers/plans/2026-08-15-native-ios-visual-pass.md` (this file)
- Modify: `.superpowers/sdd/2026-08-15-native-ios-visual-pass/progress.md` (gitignored by default — `git add -f`)
- Modify: `../obsidian/Projects/depth/specs/2026-08-15-native-ios-visual-pass-design.md`
- Modify: `../obsidian/Projects/depth/Tickets/Native depth chart field overlapping player dots and dead space.md` (DEP-207)

- [ ] **Step 1: Check off this plan's completed tasks**

Tick every `- [ ]` completed in Tasks 1–7.

- [ ] **Step 2: Update the vault spec's status**

In the vault spec's header, replace `Implementation plan: \`depth/docs/superpowers/plans/<dated>-native-ios-visual-pass.md\` (to be written)` with the actual path, and update the Status line to record that it shipped and on what date.

- [x] **Step 3: Close DEP-207**

Already done — DEP-207 was closed 2026-08-15 by depth#378, with a resolution note added to the ticket and independently re-verified. Nothing to do here; kept as a checked step so the plan's history stays accurate rather than silently deleting it.

- [ ] **Step 4: Commit**

```bash
git add -f .superpowers/sdd/2026-08-15-native-ios-visual-pass/progress.md
git add docs/superpowers/plans/2026-08-15-native-ios-visual-pass.md
git commit -m "docs(ios): check off native iOS visual pass"
```

---

## Deferred, on purpose

Named in the spec's "Out of scope" section. Do not fold any of them into these PRs.

- Light mode / adaptive colors — explicitly ruled out.
- Compare's real comparison UI — own spec.
- Favorite-team startup tier — unrelated to visual work.
- New animations/haptics beyond restrained-haptics compliance.
- Any information-architecture or interaction change — flag, don't fix, if one is discovered mid-task.
- A shared web↔native design-token build pipeline — this plan is a manual, one-time port.
