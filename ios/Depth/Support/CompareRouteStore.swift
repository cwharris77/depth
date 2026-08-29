import Foundation
import Observation

// A pending "compare these two teams" request, handed between tabs (DEP-405). The
// schedule page's game-card tap (inside DepthChartsTab's tree) asks for a matchup the
// Compare tab isn't currently showing, and the two tabs have no view-tree relationship
// to pass it through — RootTabView switches the selected tab, this store carries which
// matchup to pre-load. A present request also means "this compare session came from a
// schedule card", the signal that gates the Compare tab's "Back to schedule" pill (the
// DEP-405 analog of DEP-280's `enteredFromSchedule`).
//
// Mirrors TeamRouteStore's shape: one pending value, consumed once so a re-render can't
// re-apply a stale request. The app now has exactly two cross-tab destinations — team
// depth chart (TeamRouteStore) and a compare matchup (this) — so this is deliberately
// still a one-field store, not a general router.
@MainActor
@Observable
final class CompareRouteStore {
    /// A matchup requested by a schedule-card tap, not yet applied by the Compare tab.
    /// `Equatable` so the Compare tab can observe store changes; the pair is the
    /// `.navigationDestination(item:)` payload DEP-280 used to push — same two ids, new
    /// transport.
    struct CompareRouteRequest: Equatable, Hashable {
        let teamAId: String
        let teamBId: String
    }

    private(set) var pendingRequest: CompareRouteRequest?

    func request(teamAId: String, teamBId: String) {
        pendingRequest = CompareRouteRequest(teamAId: teamAId, teamBId: teamBId)
    }

    /// Returns the pending matchup once, clearing it so a re-render can't re-apply it.
    func consume() -> CompareRouteRequest? {
        defer { pendingRequest = nil }
        return pendingRequest
    }
}
