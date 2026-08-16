import SwiftUI

// Root view — the three-tab navigation surface (Depth Charts / Compare / Account),
// gated by the T5 update screen when the installed build is below the server's minimum.
// Composition only: real state lives in RootTabView's tabs and UpdateGateViewModel.
struct ContentView: View {
    @State private var updateGate = UpdateGateViewModel(repository: DepthEnvironment.repository)
    @State private var authSessionStore = DepthEnvironment.authSessionStore

    var body: some View {
        Group {
            if updateGate.isBlocked {
                BlockingUpdateView()
            } else {
                RootTabView(sessionStore: authSessionStore)
            }
        }
        // The app is always dark, same as the website (2026-08-15 visual-pass spec,
        // locked decision #1: "Always dark, not adaptive"). Flipping the scheme here at
        // the root is the load-bearing piece the per-screen token styling shipped on top
        // of: without it, semantic .primary/.secondary text inside the dark-styled
        // screens resolves against the light scheme and renders dark-on-dark (the
        // unreadable player-detail sheet from Cooper's visual pass). The preference
        // propagates into sheet presentations and turns every system surface (nav bars,
        // tab bar, List backgrounds) dark, so the app reads as one dark theme matching
        // the website instead of a light app with dark islands.
        .preferredColorScheme(.dark)
        .task {
            DepthEnvironment.appEvents.record(.appLaunch)
            authSessionStore.start()
            await authSessionStore.refresh()
            // Screenshot capture needs a deterministic signed-out start regardless of
            // whatever real session a prior manual run left in this simulator's
            // Keychain — sign out unconditionally after the normal restore above runs,
            // rather than skipping restore, so this behaves the same as a real
            // freshly-installed, never-signed-in app (see task-9d-screenshots-brief.md).
            if ProcessInfo.processInfo.arguments.contains("UI_TESTING_APPSTORE_SCREENSHOTS") {
                try? await authSessionStore.signOut()
            }
            await updateGate.check()
        }
        .modifier(UITestingDynamicTypeOverride())
    }
}

// UI-testing override for Dynamic Type. `-UIPreferredContentSizeCategoryName` as an
// XCUIApplication launch argument is silently inert on this iOS version (measured:
// identical element frames at `L` and at Accessibility XXXL), which would make every
// large-text assertion in DepthUITests/AccessibilityUITests.swift a vacuous pass. The
// app therefore applies the size itself, through the same environment value the real
// system setting drives — same launch-argument convention as `UI_TESTING_RESET_STATE`.
// Absent the argument this is inert and the real system setting applies.
//
// Not `private`: a `.sheet()` presentation gets a fresh `UITraitCollection` from the
// system rather than inheriting a `.dynamicTypeSize()` override set on the presenting
// view (measured directly: identical inside a switcher-sheet team row across "large"
// and "accessibility5" launches, while the same override reaches non-sheet tab content
// correctly). Every `.sheet()` whose content is covered by an accessibility-size test
// or design requirement (2026-08-15 nav-parity's `TeamSwitcherSheet`, T10's
// `PlayerDetailView`) re-applies this modifier at its own presentation point rather than
// relying on inheritance through the sheet boundary.
struct UITestingDynamicTypeOverride: ViewModifier {
    func body(content: Content) -> some View {
        if let size = Self.launchArgumentSize {
            content.dynamicTypeSize(size)
        } else {
            content
        }
    }

    /// Only the sizes the accessibility suite drives; an unrecognised name leaves the
    /// app on the real system setting rather than guessing one.
    private static var launchArgumentSize: DynamicTypeSize? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "UI_TESTING_DYNAMIC_TYPE"),
            arguments.indices.contains(index + 1)
        else { return nil }
        return switch arguments[index + 1] {
        case "large": .large
        case "accessibility1": .accessibility1
        case "accessibility3": .accessibility3
        case "accessibility5": .accessibility5
        default: nil
        }
    }
}

#Preview {
    ContentView()
}
