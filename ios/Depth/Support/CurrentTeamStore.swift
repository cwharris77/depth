import Foundation
import Observation

// App-wide team accent (2026-08-15 visual-pass follow-up). The web themes its chrome with
// the active team's `uiAccent` (TeamPageShell -> activeColors.uiAccent) and falls back to
// the neutral `uiTokens.accent` for pages with no current team (useLastAccent). Native
// mirrors that: DepthChartsTab — the owner of the current team — publishes the team's
// uiAccent here, and the root TabView reads it for its `.tint`, so the nav title, toolbar
// icons, and tab bar adopt team color instead of the app's static green. Before any team
// resolves the value is nil and the root falls back to DesignTokens.Colors.accent.
@MainActor
@Observable
final class CurrentTeamStore {
    /// The current team's `uiAccent` hex, or nil until a team resolves.
    private(set) var uiAccent: String?

    func apply(teamId: String?, from teams: [Team]) {
        uiAccent = teams.first(where: { $0.id == teamId })?.colors.uiAccent
    }
}