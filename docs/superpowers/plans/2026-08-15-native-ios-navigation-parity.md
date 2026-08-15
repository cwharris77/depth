# Native iOS Navigation Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the native iOS app so it launches directly into a team's depth chart, switches teams from a header sheet, and exposes global destinations from a bottom tab bar — matching the website's information architecture.

**Architecture:** A three-tab `TabView` (Depth Charts / Compare / Account) replaces `TeamListView` as the app root in `ContentView`. Each tab owns its own `NavigationStack`. `DepthChartsTab` resolves a startup team from `UserPreferences.lastTeamId` (falling back to a default that matches the web's `DEFAULT_TEAM_ID`) and renders `TeamDetailView` as its stack root; the existing `TeamListView` search + list is repurposed as the content of a `TeamSwitcherSheet` reached from the navigation-bar team name. No repository, cache, DTO, or query changes.

**Tech Stack:** Swift 6, SwiftUI (iOS 18 `TabView`/`Tab`), Swift Testing, XCUITest, XcodeGen.

**Spec:** `../obsidian/Projects/depth/specs/2026-08-15-native-ios-navigation-parity-design.md` — read it in full before starting. Its "Locked Decisions" section is settled; do not relitigate it.

## Global Constraints

- **Structure only, not a visual restyle.** The field component's card styling / field markings gap is a separate spec. Do not touch `DepthChartFieldView`'s visuals.
- **No repository, cache, or query changes.** `CachingDepthRepository`, `DepthRepository`, `TeamSnapshot`, all DTOs and mappers are untouched. The `listTeams` read that backed the root screen now backs the switcher sheet — same call, same cache behavior.
- **No new dependencies.** The Swift package list stays exactly `Supabase 2.55.1` (`ios/project.yml`).
- **Three tabs only: Depth Charts, Compare, Account.** No Uniform archive tab (blocked on Gate 0 data rights). Compare is an explicit placeholder in this plan — its real comparison UI is out of scope and gets its own spec.
- **Startup resolution is last-viewed → default only.** No favorite-team tier; that needs a new Supabase `user_settings.favorite_team_id` write path and is explicitly out of scope.
- **Stale/unknown preference values degrade, never throw** (AGENTS.md invariant 6). A `lastTeamId` pointing at a team id that no longer exists falls back to the default.
- **`xcodegen generate` after adding or removing any Swift file.** Never hand-edit `ios/Depth.xcodeproj`. CI enforces this with `git diff --exit-code`.
- **Every new/changed module carries a role-and-constraint header comment** (AGENTS.md §3). The repo's comment density is deliberately high; preserve existing comments through refactors.
- **Conventional Commits**, scope `ios` or `nav`. Squash-merge only. Address Greptile's initial review before merging.
- **Verification command** (find a booted simulator with `xcrun simctl list devices | grep Booted`):

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' test
```

## PR boundaries

| Task | PR | Why it is its own PR |
| --- | --- | --- |
| 1 | `feat(ios): add startup-team resolution` | Pure domain logic + unit tests. No UI change, suite stays green. |
| 2 | `feat(nav): launch into a depth chart behind a tab bar` | **Atomic.** The IA swap cannot be split — the moment `TeamListView` stops being the root, every root-anchored UI test and the launch signpost move with it. Splitting leaves `main` red. |
| 3 | `feat(ios): capture screenshot #1 from the team switcher` | Release-prep tooling + its doc, excluded from the default test scheme. Independently reviewable. |
| 4 | `docs(ios): check off native iOS navigation parity` | Plan checkboxes + SDD ledger + vault spec status, per the house docs-only-PR convention. |

---

### Task 1: Startup-team resolution

**Files:**
- Create: `ios/Depth/Domain/StartupTeam.swift`
- Create: `ios/DepthTests/StartupTeamTests.swift`

**Interfaces:**
- Consumes: nothing.
- Produces: `enum StartupTeam` with `static let defaultTeamId: String` and
  `static func resolve(lastTeamId: String?, validIds: [String]?, defaultId: String) -> String`.
  Task 2's `DepthChartsTab` calls it twice — once at init with `validIds: nil`
  (optimistic, so the chart renders before the team list round-trip finishes) and
  once when the team list arrives (validating, to correct a stale preference).

- [x] **Step 1: Write the failing tests**

Create `ios/DepthTests/StartupTeamTests.swift`:

```swift
import Testing
@testable import Depth

// Startup resolution is the one piece of launch behavior with a branch worth testing
// (spec's Testing section: "lastTeamId valid → that team; missing → default;
// stale/unknown id → default", malformed case included).
@Test func resolvesToDefaultWhenNoLastTeam() {
    #expect(StartupTeam.resolve(lastTeamId: nil) == StartupTeam.defaultTeamId)
}

@Test func resolvesToLastTeamWhenSetAndUnvalidated() {
    #expect(StartupTeam.resolve(lastTeamId: "bills") == "bills")
}

@Test func resolvesToLastTeamWhenPresentInTheLiveList() {
    #expect(StartupTeam.resolve(lastTeamId: "bills", validIds: ["bills", "seahawks"]) == "bills")
}

@Test func fallsBackToDefaultWhenLastTeamIsNoLongerALiveTeam() {
    #expect(StartupTeam.resolve(lastTeamId: "oilers", validIds: ["bills", "seahawks"]) == "seahawks")
}

@Test func fallsBackToDefaultOnBlankOrWhitespacePreference() {
    #expect(StartupTeam.resolve(lastTeamId: "") == StartupTeam.defaultTeamId)
    #expect(StartupTeam.resolve(lastTeamId: "   ") == StartupTeam.defaultTeamId)
}

@Test func trimsSurroundingWhitespaceBeforeMatching() {
    #expect(StartupTeam.resolve(lastTeamId: " bills ", validIds: ["bills"]) == "bills")
}

@Test func anEmptyLiveListStillYieldsTheDefaultRatherThanAStaleId() {
    #expect(StartupTeam.resolve(lastTeamId: "bills", validIds: []) == StartupTeam.defaultTeamId)
}

@Test func nativeDefaultMatchesTheWebDefaultTeamId() {
    // lib/teams/index.ts's DEFAULT_TEAM_ID — both clients must open the same team for a
    // first-time visitor (spec's Architecture section).
    #expect(StartupTeam.defaultTeamId == "seahawks")
}
```

- [x] **Step 2: Run the tests to verify they fail**

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthTests test
```

Expected: compile failure — `cannot find 'StartupTeam' in scope`.

- [x] **Step 3: Write the implementation**

Create `ios/Depth/Domain/StartupTeam.swift`:

```swift
import Foundation

// Which team the Depth Charts tab opens to on launch (2026-08-15 navigation-parity
// spec, locked decision #3: "Depth Charts launches into a chart, not a list").
// Deliberately mirrors the web's `resolveStartupTeam` (lib/utils/team/home-team.ts)
// minus its favorite tier, which native does not have — native resolves last-viewed →
// default only, because a favorite tier needs a Supabase `user_settings` write path
// that is out of scope for an IA change (locked decision #8).
//
// Every candidate is validated against the live team ids when they are available so a
// stale preference (team removed/renamed between releases) falls through to the default
// instead of erroring — AGENTS.md invariant 6, same defensive posture as the web helper.
enum StartupTeam {
    /// Must stay in sync with the web's `DEFAULT_TEAM_ID` (`lib/teams/index.ts`) so a
    /// first-time visitor opens the same team on both clients.
    static let defaultTeamId = "seahawks"

    /// `validIds == nil` means "the team list hasn't loaded yet": resolve optimistically
    /// so the chart can start loading before the list round-trip finishes. Call again
    /// with the loaded ids to correct a stale preference (see `DepthChartsTab`).
    static func resolve(
        lastTeamId: String?,
        validIds: [String]? = nil,
        defaultId: String = defaultTeamId
    ) -> String {
        guard
            let candidate = lastTeamId?.trimmingCharacters(in: .whitespacesAndNewlines),
            !candidate.isEmpty
        else { return defaultId }
        if let validIds, !validIds.contains(candidate) { return defaultId }
        return candidate
    }
}
```

- [x] **Step 4: Regenerate the Xcode project and run the tests**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' -only-testing:DepthTests test
```

Expected: PASS, all 8 new tests green, no existing test regressed.

- [x] **Step 5: Commit**

```bash
git add ios/Depth/Domain/StartupTeam.swift ios/DepthTests/StartupTeamTests.swift ios/Depth.xcodeproj
git commit -m "feat(ios): add startup-team resolution for the depth chart launch destination"
```

---

### Task 2: Tab-bar root, chart-first launch, and header team switcher

This is one atomic PR. Work through the steps in order; the build is expected to be broken between steps 1 and 8 and is not committed until step 12.

**Files:**
- Create: `ios/Depth/App/RootTabView.swift`
- Create: `ios/Depth/Features/Teams/TeamSwitcherSheet.swift`
- Create: `ios/Depth/Features/Teams/DepthChartsTab.swift`
- Create: `ios/Depth/Features/Compare/CompareView.swift`
- Create: `ios/Depth/Features/Settings/AccountTab.swift`
- Create: `ios/DepthUITests/UITestHelpers.swift`
- Modify: `ios/Depth/Features/Teams/TeamListView.swift` (root screen → switcher content)
- Modify: `ios/Depth/Features/TeamDetail/TeamDetailView.swift` (principal switcher toolbar item)
- Modify: `ios/Depth/Features/Teams/TeamListViewModel.swift` (drop the launch signpost)
- Modify: `ios/Depth/Features/TeamDetail/TeamDetailViewModel.swift` (own the launch signpost)
- Modify: `ios/Depth/Support/DepthSignposts.swift` (doc comments)
- Modify: `ios/Depth/Features/Settings/SettingsView.swift` (tab chrome, loading state; delete `AccountSettingsButton`)
- Modify: `ios/Depth/App/ContentView.swift` (root swap)
- Modify: `ios/Depth/App/DepthApp.swift` (stale screenshot comment)
- Test: `ios/DepthUITests/DepthUITests.swift`, `ios/DepthUITests/ShareUITests.swift`, `ios/DepthUITests/AuthUITests.swift`, `ios/DepthUITests/PerformanceUITests.swift`

**Interfaces:**
- Consumes: `StartupTeam.resolve(lastTeamId:validIds:defaultId:)` and `StartupTeam.defaultTeamId` (Task 1).
- Produces:
  - `TeamListView(repository:events:selectedTeamId:onSelect:)` — switcher content, no `NavigationStack` of its own.
  - `TeamSwitcherSheet(repository:events:selectedTeamId:onSelect:)`.
  - `DepthChartsTab(repository:preferences:sessionStore:authService:overrideService:events:)`.
  - `CompareView()`.
  - `AccountTab(repository:sessionStore:authService:events:)`.
  - `RootTabView(sessionStore:)`.
  - `TeamDetailView(viewModel:repository:preferences:sessionStore:authService:overrideService:events:onOpenTeamSwitcher:)` — `onOpenTeamSwitcher` is a required `() -> Void`.
  - UI-test accessibility identifiers: `team-switcher-button`, `team-switcher-sheet`, `compare-placeholder`. Tab bar items are addressed by label (`app.tabBars.buttons["Depth Charts"]`), not by identifier — `Tab` is a `TabContent`, not a `View`, and does not reliably accept `.accessibilityIdentifier`.

- [x] **Step 1: Turn `TeamListView` into switcher content**

Replace `ios/Depth/Features/Teams/TeamListView.swift`'s header comment and the `TeamListView` struct (through `restoreLastTeamIfNeeded()`, i.e. lines 1–119) with the following. Leave `TeamRow`, `TeamRowSkeleton`, `TeamBadge`, and the `Color(hex:)` extension below it exactly as they are.

```swift
import SwiftUI

// The searchable 32-team list. This used to be the app's root screen; as of the
// 2026-08-15 navigation-parity spec (locked decision #5) it is the *content of the team
// switcher sheet* instead — "the list stops being a place you are and becomes a control
// you use". It therefore owns no NavigationStack, no navigation destination, and no
// last-team restoration: the enclosing TeamSwitcherSheet supplies the stack and chrome,
// and DepthChartsTab owns which team is current. Selection is a callback, not a push.
struct TeamListView: View {
    @State private var viewModel: TeamListViewModel

    /// Highlighted with a checkmark so the sheet shows where you are, matching the web
    /// switcher's current-team affordance.
    private let selectedTeamId: String
    private let onSelect: (String) -> Void

    init(
        repository: CachingDepthRepository,
        events: any AppEventsRecording = NoOpAppEventsRecorder(),
        selectedTeamId: String,
        onSelect: @escaping (String) -> Void
    ) {
        self.selectedTeamId = selectedTeamId
        self.onSelect = onSelect
        _viewModel = State(initialValue: TeamListViewModel(repository: repository, events: events))
    }

    var body: some View {
        content
            .searchable(text: $viewModel.searchText, prompt: "Search teams")
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            List(0..<8, id: \.self) { _ in TeamRowSkeleton() }
                .listStyle(.plain)
                .redacted(reason: .placeholder)
                .accessibilityHidden(true)

        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load teams", systemImage: "wifi.slash")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
            }

        case .loaded:
            if viewModel.filteredTeams.isEmpty {
                if viewModel.searchText.isEmpty {
                    ContentUnavailableView("No Teams", systemImage: "sportscourt")
                } else {
                    ContentUnavailableView.search(text: viewModel.searchText)
                }
            } else {
                List(viewModel.filteredTeams) { team in
                    Button {
                        onSelect(team.id)
                    } label: {
                        HStack {
                            TeamRow(team: team)
                            Spacer()
                            if team.id == selectedTeamId {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.tint)
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("team-row-\(team.id)")
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load() }
            }
        }
    }
}
```

- [x] **Step 2: Add the switcher sheet**

Create `ios/Depth/Features/Teams/TeamSwitcherSheet.swift`:

```swift
import SwiftUI

// The team switcher (2026-08-15 navigation-parity spec, locked decisions #4 and #5) —
// the native equivalent of the web's NavSwitcher: tapping the team name in the
// navigation bar opens this sheet, picking a team swaps the chart underneath and
// dismisses. It is deliberately thin: all list/search/empty/error behavior comes from
// TeamListView unchanged, so there is no second search or list implementation to keep
// in sync.
struct TeamSwitcherSheet: View {
    @Environment(\.dismiss) private var dismiss

    let repository: CachingDepthRepository
    var events: any AppEventsRecording = NoOpAppEventsRecorder()
    let selectedTeamId: String
    let onSelect: (String) -> Void

    var body: some View {
        NavigationStack {
            TeamListView(
                repository: repository,
                events: events,
                selectedTeamId: selectedTeamId
            ) { teamId in
                onSelect(teamId)
                dismiss()
            }
            .navigationTitle("Teams")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .frame(minWidth: 44, minHeight: 44)
                }
            }
        }
        .accessibilityIdentifier("team-switcher-sheet")
    }
}
```

- [x] **Step 3: Make the navigation-bar team name the switcher trigger**

In `ios/Depth/Features/TeamDetail/TeamDetailView.swift`:

1. Add the stored property after `private let events: any AppEventsRecording` (line 22):

```swift
    /// Opens the team switcher. Required, not optional: `DepthChartsTab` is the only
    /// place this view is constructed now that it is a tab's stack root rather than a
    /// pushed destination, so an unset case would be dead code.
    private let onOpenTeamSwitcher: () -> Void
```

2. Add `onOpenTeamSwitcher: @escaping () -> Void` as the final `init` parameter and assign `self.onOpenTeamSwitcher = onOpenTeamSwitcher` in the body.

3. Extract the title, replacing the inline `.navigationTitle(...)` expression. Add near `displayedSnapshot`:

```swift
    private var navigationTitleText: String {
        viewModel.snapshot.map { "\($0.team.city) \($0.team.name)" } ?? "Team"
    }
```

4. Replace line 47 with `.navigationTitle(navigationTitleText)`. Keep it: the principal toolbar item below wins for display, but the title still supplies the back-button label for pushed destinations (Schedule).

5. Add a principal toolbar item ahead of the existing `ToolbarItemGroup(placement: .topBarTrailing)` inside `.toolbar`:

```swift
                ToolbarItem(placement: .principal) {
                    Button(action: onOpenTeamSwitcher) {
                        HStack(spacing: 4) {
                            Text(navigationTitleText)
                                .font(.headline)
                            Image(systemName: "chevron.down")
                                .font(.caption2.weight(.bold))
                        }
                    }
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("team-switcher-button")
                    .accessibilityLabel("\(navigationTitleText), change team")
                    .accessibilityHint("Opens the team switcher")
                }
```

- [x] **Step 4: Add the Depth Charts tab**

Create `ios/Depth/Features/Teams/DepthChartsTab.swift`:

```swift
import SwiftUI

// Tab 1 of the app's root TabView (2026-08-15 navigation-parity spec). Owns the two
// things the old TeamListView root owned implicitly: which team is current, and when it
// is persisted. It renders TeamDetailView as the stack *root* rather than a pushed
// destination — that is the whole point of the spec ("launch straight into a team's
// depth chart"), and it removes the visible list-then-push transition the old
// `TeamListView.restoreLastTeamIfNeeded()` produced on relaunch.
struct DepthChartsTab: View {
    /// Resolved before first render from `UserPreferences.lastTeamId` — optimistically,
    /// without waiting on the team list, so the snapshot fetch starts immediately. The
    /// `.task` below re-resolves once the live ids are known and corrects a stale
    /// preference (AGENTS.md invariant 6: stale input degrades, never throws).
    @State private var teamId: String
    @State private var showSwitcher = false

    private let repository: CachingDepthRepository
    private let preferences: UserPreferences
    private let sessionStore: AuthSessionStore
    private let authService: any DepthAuthServicing
    private let overrideService: any DepthOverrideServicing
    private let events: any AppEventsRecording

    init(
        repository: CachingDepthRepository,
        preferences: UserPreferences,
        sessionStore: AuthSessionStore,
        authService: any DepthAuthServicing,
        overrideService: any DepthOverrideServicing,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        self.repository = repository
        self.preferences = preferences
        self.sessionStore = sessionStore
        self.authService = authService
        self.overrideService = overrideService
        self.events = events
        _teamId = State(initialValue: StartupTeam.resolve(lastTeamId: preferences.lastTeamId))
    }

    var body: some View {
        NavigationStack {
            TeamDetailView(
                viewModel: TeamDetailViewModel(teamId: teamId, repository: repository, events: events),
                repository: repository,
                preferences: preferences,
                sessionStore: sessionStore,
                authService: authService,
                overrideService: overrideService,
                events: events,
                onOpenTeamSwitcher: { showSwitcher = true }
            )
            // Rebuilds the whole team-detail subtree (view model, unit picker, history,
            // overrides) when the switcher picks a different team — the SwiftUI
            // key-reset idiom, rather than mutating a view model in place.
            .id(teamId)
        }
        .sheet(isPresented: $showSwitcher) {
            TeamSwitcherSheet(
                repository: repository,
                events: events,
                selectedTeamId: teamId
            ) { selected in
                teamId = selected
            }
        }
        .task {
            // A stale `lastTeamId` (team removed or renamed between releases) would
            // otherwise strand the user on a permanently failing chart. Correcting it
            // here — after the cached/refreshed list arrives — is the only place the
            // live ids are known, and it is a no-op in the overwhelmingly common case.
            guard let teams = try? await repository.teams() else { return }
            teamId = StartupTeam.resolve(lastTeamId: teamId, validIds: teams.map(\.id))
        }
        .onChange(of: teamId, initial: true) { _, newValue in
            preferences.lastTeamId = newValue
        }
    }
}
```

- [x] **Step 5: Add the Compare placeholder**

Create `ios/Depth/Features/Compare/CompareView.swift`:

```swift
import SwiftUI

// Tab 2 of the root TabView. Deliberately a placeholder (2026-08-15 navigation-parity
// spec, locked decision #6): the web has a /compare route, native has no comparison UI
// in any form, and building one is genuinely new scope with its own spec. The tab exists
// here so the navigation surface is complete and honest about what is coming, not so the
// feature can be quietly half-shipped.
struct CompareView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Compare Teams", systemImage: "rectangle.split.2x1")
            } description: {
                Text("Side-by-side team comparison is coming soon.")
            }
            .accessibilityIdentifier("compare-placeholder")
            .navigationTitle("Compare")
        }
    }
}
```

- [x] **Step 6: Promote Settings to a tab**

In `ios/Depth/Features/Settings/SettingsView.swift`:

1. Delete `@Environment(\.dismiss) private var dismiss` (line 13) and the entire `.toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }` block (lines 73–77). A tab is not dismissible.
2. Delete the whole `AccountSettingsButton` struct (lines ~110–133). Its only call site was `TeamListView`'s toolbar, which no longer exists; Account is reachable from the tab bar now. Per AGENTS.md, unused code is deleted cleanly rather than kept for compatibility.
3. Replace the `dataSavedAt` property declaration (lines 17–19) with:

```swift
    /// The team list's on-device cache timestamp, supplied by `AccountTab`.
    let dataSavedAt: Date?
    /// True while `AccountTab` is still reading the timestamp. Account is now reachable
    /// at launch, so this section can render before the value exists — without this the
    /// Data row would show its "no saved data" fallback and then jump to a real date
    /// (AGENTS.md mistake #16). It renders a redacted placeholder instead.
    var dataSavedAtLoading: Bool = false
```

4. Replace the `Section("Data")` body (lines 63–70) with:

```swift
                Section("Data") {
                    if dataSavedAtLoading {
                        SavedOnDeviceLabel(cachedAt: Date())
                            .redacted(reason: .placeholder)
                            .accessibilityHidden(true)
                    } else {
                        SavedOnDeviceLabel(cachedAt: dataSavedAt)
                            .accessibilityIdentifier("settings-data-saved-at")
                    }
                    Text(DataTimestamp.explanation)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("settings-data-explanation")
                }
```

Create `ios/Depth/Features/Settings/AccountTab.swift`:

```swift
import SwiftUI

// Tab 3 of the root TabView (2026-08-15 navigation-parity spec, locked decision #7):
// SettingsView's content is unchanged, it just stops being a sheet buried behind a
// toolbar button inside team detail and becomes always-reachable. The one thing this
// wrapper adds is the Data section's timestamp, which the team-list view model used to
// supply for free because Settings could only be opened from a screen that had already
// loaded it — reachable-at-launch means reading it here instead.
struct AccountTab: View {
    @State private var dataSavedAt: Date?
    @State private var isLoadingTimestamp = true

    let repository: CachingDepthRepository
    let sessionStore: AuthSessionStore
    let authService: any DepthAuthServicing
    var events: any AppEventsRecording = NoOpAppEventsRecorder()

    var body: some View {
        SettingsView(
            sessionStore: sessionStore,
            authService: authService,
            dataSavedAt: dataSavedAt,
            dataSavedAtLoading: isLoadingTimestamp,
            events: events
        )
        .task {
            dataSavedAt = await repository.teamListCachedAt()
            isLoadingTimestamp = false
        }
    }
}
```

- [x] **Step 7: Add the root tab bar**

Create `ios/Depth/App/RootTabView.swift`:

```swift
import SwiftUI

// The app's root navigation surface (2026-08-15 navigation-parity spec, locked decisions
// #1 and #2). The web's global nav is a left hamburger drawer; native uses a bottom tab
// bar instead — same function, fewer taps, and hidden navigation is discouraged on iOS.
// Three tabs only: Uniform archive is deliberately absent (blocked on Gate 0 data
// rights, no native implementation), because a tab leading to an unshippable feature is
// a dead end, not parity.
//
// Each tab owns its own NavigationStack (inside its tab view) so per-tab navigation
// state survives tab switches — standard SwiftUI practice.
struct RootTabView: View {
    let sessionStore: AuthSessionStore

    var body: some View {
        TabView {
            Tab("Depth Charts", systemImage: "sportscourt") {
                DepthChartsTab(
                    repository: DepthEnvironment.repository,
                    preferences: DepthEnvironment.preferences,
                    sessionStore: sessionStore,
                    authService: DepthEnvironment.authService,
                    overrideService: DepthEnvironment.overrideService,
                    events: DepthEnvironment.appEvents
                )
            }

            Tab("Compare", systemImage: "rectangle.split.2x1") {
                CompareView()
            }

            Tab("Account", systemImage: "person.crop.circle") {
                AccountTab(
                    repository: DepthEnvironment.repository,
                    sessionStore: sessionStore,
                    authService: DepthEnvironment.authService,
                    events: DepthEnvironment.appEvents
                )
            }
        }
    }
}
```

- [x] **Step 8: Swap the root and fix the two stale comments**

In `ios/Depth/App/ContentView.swift`, replace the `TeamListView(...)` call (lines 15–22) with `RootTabView(sessionStore: authSessionStore)`, and update the file header comment:

```swift
// Root view — the three-tab navigation surface (Depth Charts / Compare / Account),
// gated by the T5 update screen when the installed build is below the server's minimum.
// Composition only: real state lives in RootTabView's tabs and UpdateGateViewModel.
```

In `ios/Depth/App/DepthApp.swift`, replace the `UI_TESTING_APPSTORE_SCREENSHOTS` comment block (lines 22–31) with:

```swift
        // App Store screenshot capture (task-9d-screenshots-brief.md) needs the same
        // clean-slate starting state as UI_TESTING_RESET_STATE: with no restored team,
        // the Depth Charts tab opens on StartupTeam.defaultTeamId, so a screenshot run
        // always starts from the same chart regardless of what a prior manual session
        // left behind. AppStoreScreenshotsUITests then opens the team switcher and picks
        // Buffalo Bills itself; that selection persists for the rest of the one launch.
        // The signed-out half of "deterministic, signed-out state" is enforced in
        // ContentView's `.task` (after session restore has a chance to run).
```

- [x] **Step 9: Move the app-launch signpost onto the depth chart**

The launch signpost's whole purpose is "app init → first useful render". The first useful render is now the depth chart, not the team list.

1. In `ios/Depth/Features/Teams/TeamListViewModel.swift`, delete the `DepthSignposts.endAppLaunchIfNeeded()` call and its four-line comment (lines 50–53).
2. In `ios/Depth/Features/TeamDetail/TeamDetailViewModel.swift`, inside `load()`, immediately after `loadState = .loaded`, add:

```swift
            // Closes the app-launch signpost on the first screen with real, user-visible
            // content. As of the 2026-08-15 navigation-parity change that is this depth
            // chart — the launch destination — not the team list, which now only loads
            // when the switcher sheet is opened. No-op on every later load (background
            // refresh, pull-to-refresh, team switch).
            DepthSignposts.endAppLaunchIfNeeded()
```

3. In `ios/Depth/Support/DepthSignposts.swift`, replace the `appLaunch` doc comment (lines 18–34) with:

```swift
    /// App init → first useful render, closed by `TeamDetailViewModel.load()` on its
    /// first successful load: the depth chart is the launch destination (2026-08-15
    /// navigation-parity spec), so it is now both the first screen with real content and
    /// the gate the rest of the app renders behind. This interval therefore includes
    /// startup-team resolution, which is a pure `UserPreferences` read and adds no I/O.
    ///
    /// This closes when the data is ready, not when SwiftUI has finished committing the
    /// resulting render pass — the same "data-ready" proxy `AppEventsRecorder`'s
    /// `depthChartReached` event already uses. A render-accurate close would need a
    /// paint-completion hook with a SwiftUI-lifecycle dependency this signpost's other
    /// two call sites (pure `Data/` layer, no view access) don't have. The XCUITest
    /// regression guard (`PerformanceUITests.swift`) waits on an actually-rendered
    /// player slot rather than just this interval closing, so a budget regression is
    /// still caught where this interval alone would look fine.
    static let appLaunch: StaticString = "AppLaunchToFirstUsefulRender"
```

4. In the same file, update the `launchState` doc comment's file reference from `TeamListViewModel.load()` to `TeamDetailViewModel.load()`, and `beginAppLaunch`'s "No-op if already started" comment likewise (`TeamDetailViewModel.load()` runs again on refresh and team switch).
5. In `ios/Depth/App/DepthApp.swift`, update the `beginAppLaunch()` comment on line 11 to read `closed by TeamDetailViewModel.load() on its first successful load`.

- [x] **Step 10: Add the UI-test helper and update the existing journeys**

Create `ios/DepthUITests/UITestHelpers.swift`:

```swift
import XCTest

// Shared navigation helpers for the UI suites. Team selection moved out of the app root
// and into the switcher sheet (2026-08-15 navigation-parity spec), so every journey that
// used to "type in the root search field and tap a row" now goes through the same three
// steps — worth one helper rather than four copies (AGENTS.md mistake #17).
extension XCUIApplication {
    /// Waits for the launch depth chart to actually render a tappable player slot.
    /// The unit picker exists as soon as a snapshot resolves, but a slot is the accurate
    /// "chart rendered" signal.
    @discardableResult
    func waitForDepthChart(timeout: TimeInterval = 15) -> Bool {
        buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'"))
            .firstMatch
            .waitForExistence(timeout: timeout)
    }

    /// Opens the switcher from the navigation-bar team name, searches, and selects a
    /// team. Returns once the switcher has dismissed and the chart has re-rendered.
    func selectTeam(_ teamId: String, searching query: String, file: StaticString = #filePath, line: UInt = #line) {
        let switcher = buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the depth chart header should expose the team switcher", file: file, line: line)
        switcher.tap()

        let searchField = searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10), "the switcher sheet should offer team search", file: file, line: line)
        searchField.tap()
        searchField.typeText(query)

        let teamRow = buttons["team-row-\(teamId)"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 10), "searching \"\(query)\" should surface the \(teamId) row", file: file, line: line)
        teamRow.tap()

        XCTAssertFalse(
            otherElements["team-switcher-sheet"].waitForExistence(timeout: 3),
            "selecting a team should dismiss the switcher", file: file, line: line
        )
        XCTAssertTrue(waitForDepthChart(), "the chart should render for the newly selected team", file: file, line: line)
    }
}
```

In `ios/DepthUITests/DepthUITests.swift`, update the file header to describe the new journey and replace the three "search at root, tap row" preambles. For `testSearchTeamOpenChartAndPlayerDetail`, replace lines 13–32 (through the `playerSlot` assertion) with:

```swift
    func testLaunchesIntoAChartThenSwitchesTeamAndOpensPlayerDetail() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()

        // No stored preference → the default team's chart is the launch destination.
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")

        app.selectTeam("bills", searching: "Bills")

        let unitPicker = app.segmentedControls.firstMatch
        XCTAssertTrue(unitPicker.waitForExistence(timeout: 10), "depth chart should render a unit picker once the team snapshot loads")

        let playerSlot = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
        XCTAssertTrue(playerSlot.waitForExistence(timeout: 10), "at least one filled depth-chart slot should be tappable")
        playerSlot.tap()
```

For `testOpenTeamSchedule`, replace lines 67–74 with:

```swift
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("bills", searching: "Bills")
```

For `testOpenHistoricalRosterProfileAndReturnToToday`, replace lines 94–101 with:

```swift
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        app.selectTeam("seahawks", searching: "Seahawks")
```

In `ios/DepthUITests/ShareUITests.swift`, replace lines 12–19 with the same two lines used for Bills above.

In `ios/DepthUITests/AuthUITests.swift`, replace the `settings-button` block (lines 10–15) with:

```swift
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")

        let accountTab = app.tabBars.buttons["Account"]
        XCTAssertTrue(accountTab.waitForExistence(timeout: 10), "Account should be reachable from the tab bar")
        accountTab.tap()
```

- [x] **Step 11: Add the two new UI tests from the spec**

Append to `ios/DepthUITests/DepthUITests.swift`:

```swift
    /// Locked decisions #1/#2/#6/#7: the tab bar exists, all three tabs are reachable,
    /// and each renders its own content.
    func testTabBarReachesAllThreeDestinations() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "Depth Charts should be the launch tab")

        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 10), "the app should present a bottom tab bar")

        tabs.buttons["Compare"].tap()
        XCTAssertTrue(
            app.otherElements["compare-placeholder"].waitForExistence(timeout: 10),
            "Compare should render its coming-soon placeholder"
        )

        tabs.buttons["Account"].tap()
        XCTAssertTrue(
            app.staticTexts["settings-about-name"].waitForExistence(timeout: 10),
            "Account should render the settings content"
        )

        tabs.buttons["Depth Charts"].tap()
        XCTAssertTrue(app.waitForDepthChart(), "returning to Depth Charts should show the chart again")
    }

    /// Locked decision #3 plus the spec's restoration requirement: the last-viewed team
    /// is the launch destination on the next launch, with no list-then-push transition.
    func testRelaunchRestoresTheLastViewedTeamAsTheLaunchDestination() throws {
        let app = XCUIApplication()
        app.launchArguments = ["UI_TESTING_RESET_STATE"]
        app.launch()
        XCTAssertTrue(app.waitForDepthChart())
        app.selectTeam("bills", searching: "Bills")
        app.terminate()

        // No reset argument — this launch must inherit the stored preference.
        app.launchArguments = []
        app.launch()
        XCTAssertTrue(app.waitForDepthChart(), "relaunch should open a chart directly")

        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 10))
        XCTAssertTrue(
            switcher.label.contains("Buffalo Bills"),
            "relaunch should restore the last-viewed team, got \"\(switcher.label)\""
        )
    }
```

- [x] **Step 12: Re-point the performance tests at the chart**

In `ios/DepthUITests/PerformanceUITests.swift`, replace `waitForFirstTeamRow` (lines 22–31) with:

```swift
    /// The launch destination is a depth chart as of the 2026-08-15 navigation-parity
    /// change, so "first useful render" is measured against a rendered player slot
    /// (`player-slot-*`, `DepthChartFieldView.swift`) rather than a team row. Both the
    /// unit picker and the navigation bar exist before any snapshot data arrives, so
    /// neither is proof the chart actually rendered (the same Greptile P1 that ruled out
    /// `.searchable`'s search field in PR #371).
    private func waitForDepthChart(in app: XCUIApplication, timeout: TimeInterval = 15) -> Bool {
        app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'player-slot-'")).firstMatch
            .waitForExistence(timeout: timeout)
    }
```

Update the three call sites (`_ = waitForFirstTeamRow(in: app)` and the two `XCTAssertTrue(waitForFirstTeamRow(in: app), ...)`) to `waitForDepthChart(in: app)`, with messages reading "depth chart should load on the priming launch" / "…on the warm relaunch". Leave the 15s budget and its rationale comment as they are; add one sentence to that comment:

```swift
    /// The measured interval now also covers startup-team resolution and the team
    /// snapshot query, where it previously covered the lighter team-list query — re-run
    /// `testAppLaunchSignpostMetric` on CI after this lands and widen the budget only if
    /// a real CI number exceeds it, not preemptively.
```

- [x] **Step 13: Regenerate, build, and run the full suite**

```bash
cd ios && xcodegen generate && cd ..
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<SIM_ID>' test
```

Expected: PASS. If a new UI test looks flaky, reproduce against the same device type CI used and read the xcresult's accessibility hierarchy rather than widening timeouts — CI runs a two-leg matrix (oldest-supported-class + current flagship) and the small-screen leg has previously exposed below-the-fold elements that never render until scrolled.

- [x] **Step 14: Verify in the simulator by hand**

Launch the app on a booted simulator and confirm, with a screenshot for the PR body: (a) it opens on a depth chart, not a list; (b) the header team name opens the switcher and picking a team swaps the chart; (c) all three tabs render; (d) force-quit and relaunch opens the last-viewed team with no list-then-push flash.

- [x] **Step 15: Commit**

```bash
git add ios docs
git commit -m "feat(nav): launch into a depth chart behind a three-tab root"
```

---

### Task 3: Screenshot automation and its doc

**Files:**
- Modify: `ios/DepthUITests/AppStoreScreenshotsUITests.swift:22-35`
- Modify: `docs/ios-appstore-screenshots.md`

**Interfaces:**
- Consumes: `team-switcher-button` / `team-switcher-sheet` identifiers and `XCUIApplication.waitForDepthChart()` (Task 2).
- Produces: nothing other tasks depend on.

- [x] **Step 1: Capture screenshot #1 from the switcher**

Replace the "1. Team selector/search" block (lines 22–35) with:

```swift
        // 1. Team selector/search — "Every team. One clear depth chart." The selector is
        // no longer the app root (2026-08-15 navigation-parity spec); it is the switcher
        // sheet, so this opens it explicitly. The five-shot sequence and its captions are
        // otherwise unchanged.
        XCTAssertTrue(app.waitForDepthChart(), "the app should launch straight into a depth chart")
        let switcher = app.buttons["team-switcher-button"]
        XCTAssertTrue(switcher.waitForExistence(timeout: 15), "the chart header should expose the team switcher")
        switcher.tap()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 15), "the switcher sheet should offer team search")
        searchField.tap()
        searchField.typeText("Bills")

        let teamRow = app.buttons["team-row-bills"]
        XCTAssertTrue(teamRow.waitForExistence(timeout: 15), "searching \"Bills\" should surface the Buffalo Bills row")
        // Dismiss the keyboard before capturing — a raw post-typing screenshot would
        // show the on-screen keyboard covering most of the result, which isn't a clean
        // release screenshot.
        app.keyboards.buttons["Search"].tap()
        attachScreenshot(name: "01-team-search")
```

The `teamRow.tap()` that opens screenshot #2 already follows; it now dismisses the sheet rather than pushing, and the subsequent unit-picker/player-slot waits are unchanged.

- [x] **Step 2: Update the screenshot doc**

In `docs/ios-appstore-screenshots.md`, update every description of screenshot #1 and the flow narrative: the app launches into a depth chart, screenshot #1 is the team switcher sheet opened from the header team name, and screenshots #2–#5 follow selecting Buffalo Bills from that sheet. Captions and the required simulator/resolution are unchanged.

- [x] **Step 3: Run the screenshot suite explicitly**

It is excluded from the default scheme, so run it on its own against a 6.9-inch simulator:

```bash
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=<6.9_INCH_SIM_ID>' -only-testing:DepthUITests/AppStoreScreenshotsUITests test
```

Expected: PASS with five attachments. Export the PNGs from the `.xcresult` per the doc and eyeball #1 — it must show the switcher sheet with the Bills row visible and no keyboard.

- [x] **Step 4: Commit**

```bash
git add ios/DepthUITests/AppStoreScreenshotsUITests.swift docs/ios-appstore-screenshots.md
git commit -m "feat(ios): capture App Store screenshot #1 from the team switcher"
```

---

### Task 4: Documentation and ledger

**Files:**
- Modify: `docs/superpowers/plans/2026-08-15-native-ios-navigation-parity.md` (this file)
- Modify: `.superpowers/sdd/2026-08-15-native-ios-navigation-parity/progress.md` (gitignored by default — `git add -f`)
- Modify: `../obsidian/Projects/depth/specs/2026-08-15-native-ios-navigation-parity-design.md`

- [x] **Step 1: Check off this plan's completed tasks**

Tick every `- [ ]` completed in Tasks 1–3.

- [x] **Step 2: Point the vault spec at the real plan**

In the vault spec's header, replace `Implementation plan: \`depth/docs/superpowers/plans/<dated>-native-ios-navigation-parity.md\` (to be written)` with the actual path, and update the Status line to record that it shipped and on what date.

- [x] **Step 3: Commit and merge**

```bash
git add -f .superpowers/sdd/2026-08-15-native-ios-navigation-parity/progress.md
git add docs/superpowers/plans/2026-08-15-native-ios-navigation-parity.md
git commit -m "docs(ios): check off native iOS navigation parity"
```

---

## Deferred, on purpose

Each of these is named in the spec's "Out of scope" section. Do not fold any of them into these PRs.

- Compare's real comparison UI — own spec.
- Uniform archive — blocked on Gate 0 data rights.
- Favorite-team startup tier — needs a new Supabase `user_settings.favorite_team_id` write path.
- Field component visual styling (card treatment, field markings, gradient, hash marks) — own spec.
- Any visual restyle toward the web's exact dark theme.
- T10 consumer polish — still externally gated on Gate 0. This work lands **before** T10 so T10's accessibility/VoiceOver pass runs against the final navigation rather than being redone.
