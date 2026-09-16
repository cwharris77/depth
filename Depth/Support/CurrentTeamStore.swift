import Foundation
import Observation

// App-wide current-team colors (2026-08-15 visual-pass follow-up). DepthChartsTab — the
// owner of the current team — publishes the active kit's colors here, and the root TabView,
// Stats, and Schedule read them, so a kit change reaches every surface the instant the
// roster page resolves it, with no separate cross-page cache to keep in sync.
//
// Publishes the kit's three real jersey colors rather than one pre-picked hex (DEP-424):
// each consumer asks TeamSurfaces for the surface it is painting, instead of every caller
// receiving one color that had to be legible everywhere at once. That single-hex shape is
// what `uiAccent` was, and why it drifted into 63 invented hues — see
// ../../obsidian/Projects/depth/specs/2026-09-01-team-color-surface-rules-design.md.
//
// DEP-278: `apply` is the team-switch fallback (the base curated color, known immediately
// from the team list). `refine` is called by TeamDetailView once it resolves the actively
// picked kit.
@MainActor
@Observable
final class CurrentTeamStore {
    /// The current kit's jersey colors, or nil until a team resolves.
    private(set) var colors: JerseyColors?

    func apply(teamId: String?, from teams: [Team]) {
        colors = teams.first(where: { $0.id == teamId })?.colors.jersey
    }

    /// Refines the published colors to the actively-selected kit. Called whenever
    /// TeamDetailView's resolved `fieldColors` (or the base team color, absent a kit pick)
    /// changes for the current team.
    func refine(colors newColors: JerseyColors) {
        colors = newColors
    }

    /// DEP-565 (1C edit-status redesign): the depth-chart edit bar, while edit mode is on.
    /// Same publish-up shape as `colors` — TeamDetailView owns edit mode, but the bar has to
    /// be drawn by RootTabView, over the tab bar, because hiding the tab bar from inside the
    /// tab re-lays-out the whole page on a UIKit animation (the edit-mode "bounce").
    private(set) var editBar: DepthChartEditBarRequest?

    func showEditBar(_ request: DepthChartEditBarRequest?) {
        editBar = request
    }
}

/// What RootTabView needs to draw the depth-chart edit bar over the tab bar.
struct DepthChartEditBarRequest {
    /// The tab bar's footprint (the tab content's bottom safe-area inset), measured by
    /// TeamDetailView — the region the bar and its backing cover.
    let tabBarInset: CGFloat
    let isMotionReduced: Bool
    let onDone: @MainActor () -> Void
}
