import Foundation
import Observation

// App-wide team accent (2026-08-15 visual-pass follow-up). The web themes its chrome with
// the active team's `uiAccent` (TeamPageShell -> activeColors.uiAccent) and falls back to
// the neutral `uiTokens.accent` for pages with no current team (useLastAccent). Native
// mirrors that: DepthChartsTab — the owner of the current team — publishes the team's
// uiAccent here, and the root TabView reads it for its `.tint`, so the nav title, toolbar
// icons, and tab bar adopt team color instead of the app's static green. Before any team
// resolves the value is nil and the root falls back to DesignTokens.Colors.accent.
//
// DEP-278 follow-up: `apply` is the team-switch fallback (the base curated color, known
// immediately from the team list). `refine` is called by TeamDetailView once it resolves
// the actively-picked kit (web parity: `useKitColors`) — the same store, so the tab tint,
// Stats, and Schedule all pick up a kit change the instant the roster page resolves it,
// with no separate cross-page cache to keep in sync.
@MainActor
@Observable
final class CurrentTeamStore {
    /// The current team's `uiAccent` hex, or nil until a team resolves.
    private(set) var uiAccent: String?

    func apply(teamId: String?, from teams: [Team]) {
        uiAccent = teams.first(where: { $0.id == teamId })?.colors.uiAccent
    }

    /// Refines the published accent to the actively-selected kit's color. Called
    /// whenever TeamDetailView's resolved `fieldColors` (or the base team color, absent
    /// a kit pick) changes for the current team.
    func refine(uiAccent hex: String) {
        uiAccent = hex
    }
}