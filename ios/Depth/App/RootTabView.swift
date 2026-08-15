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
