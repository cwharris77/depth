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
    /// Published by DepthChartsTab; the team accent the chrome tints with.
    let currentTeamStore: CurrentTeamStore

    var body: some View {
        TabView {
            Tab("Depth Charts", systemImage: "figure.american.football") {
                DepthChartsTab(
                    repository: DepthEnvironment.repository,
                    preferences: DepthEnvironment.preferences,
                    sessionStore: sessionStore,
                    overrideService: DepthEnvironment.overrideService,
                    events: DepthEnvironment.appEvents,
                    currentTeamStore: currentTeamStore
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
        // Selected-tab tint from the current team's uiAccent (visual-pass follow-up:
        // "team colors aren't coming through the chrome"). DepthChartsTab publishes the
        // active team's accent into CurrentTeamStore, so the nav title, toolbar icons,
        // and tab bar adopt team color — the same theming the web applies via
        // activeColors.uiAccent. Before a team resolves (fresh launch) the app falls
        // back to its own accent, mirroring web's useLastAccent fallback. The unselected
        // tab color is not controllable through SwiftUI's public TabView/Tab API on this
        // iOS version without a UIKit appearance bridge — left at the system default
        // deliberately rather than reaching for private API.
        .tint(currentTeamStore.uiAccent.map(Color.init(hex:)) ?? DesignTokens.Colors.accent)
    }
}
