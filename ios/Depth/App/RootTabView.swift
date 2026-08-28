import SwiftUI

// The three root tabs, in TabView order. DEP-251: named (rather than left as bare
// `Tab { }` closures with no selection binding) so OnboardingController can drive the
// TabView's `selection` — Settings' "Take the tour" row needs to jump back to Depth
// Charts before the coachmark sequence starts, since every current coachmark target
// lives there. No `.account` case (DEP-252 moved it out of the tab bar entirely — see
// below) since nothing needs to select or target it as a tab anymore.
enum RootTab: Hashable {
    case depthCharts
    case compare
    case uniforms
}

// The app's root navigation surface (2026-08-15 navigation-parity spec, locked decisions
// #1 and #2). The web's global nav is a left hamburger drawer; native uses a bottom tab
// bar instead — same function, fewer taps, and hidden navigation is discouraged on iOS.
// Three tabs: Depth Charts, Compare, Uniforms. The uniform archive was deliberately
// absent in the navigation-parity spec (blocked on Gate 0 data rights, no native
// implementation); it is added here now that the native archive tab exists — the data
// rights question was Cooper's call to unblock, and the repository's listUniforms read
// ships the all-32-kits archive with no per-team snapshot dependency.
//
// DEP-252: Account moved out of the tab bar entirely — it's a personal affordance, not
// a content section, so it no longer belongs beside content tabs. It now opens as a
// sheet from a trailing nav-bar icon on the team page (`TeamDetailView`), the slot
// DEP-236 freed by moving the ROSTER/SCHEDULE/STATS switcher out of the nav bar.
//
// Each tab owns its own NavigationStack (inside its tab view) so per-tab navigation
// state survives tab switches — standard SwiftUI practice.
struct RootTabView: View {
    let sessionStore: AuthSessionStore
    /// Published by DepthChartsTab; the team accent the chrome tints with.
    let currentTeamStore: CurrentTeamStore
    /// DEP-251: two-way bound to the TabView's `selection` below so Settings' "Take the
    /// tour" row can jump to Depth Charts before starting the coachmark sequence.
    @Bindable var onboarding: OnboardingController

    var body: some View {
        TabView(selection: $onboarding.activeTab) {
            // DEP-252: `football.fill` (ball alone) replaces the person-throwing glyph —
            // Cooper's design-pass call, no other reasoning behind the swap.
            Tab("Depth Charts", systemImage: "football.fill", value: RootTab.depthCharts) {
                DepthChartsTab(
                    repository: DepthEnvironment.repository,
                    preferences: DepthEnvironment.preferences,
                    sessionStore: sessionStore,
                    overrideService: DepthEnvironment.overrideService,
                    events: DepthEnvironment.appEvents,
                    currentTeamStore: currentTeamStore,
                    userSettingsStore: DepthEnvironment.userSettingsStore,
                    teamRouteStore: DepthEnvironment.teamRouteStore
                )
            }

            Tab("Compare", systemImage: "rectangle.split.2x1", value: RootTab.compare) {
                CompareView(repository: DepthEnvironment.repository)
            }

            Tab("Uniforms", systemImage: "tshirt", value: RootTab.uniforms) {
                // The archive's kit sheet can send you to that team's depth chart. This
                // view owns the tab selection, so the jump is composed here: park the
                // team id where DepthChartsTab will pick it up, then switch tabs.
                UniformsTab(repository: DepthEnvironment.repository) { teamId in
                    DepthEnvironment.teamRouteStore.request(teamId: teamId)
                    onboarding.activeTab = .depthCharts
                }
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
