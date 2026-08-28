import Foundation
import Observation

// A pending "show this team's depth chart" request, handed between tabs. The uniform
// archive's kit sheet can ask for a team the Depth Charts tab isn't currently on, and the
// two tabs have no view-tree relationship to pass it through — RootTabView switches the
// selected tab, this store carries which team.
//
// Deliberately one nullable field and not a general router: the app has exactly one
// cross-tab destination today. `consume()` rather than a plain read so the request can't
// fire a second time when DepthChartsTab re-renders for an unrelated reason.
@MainActor
@Observable
final class TeamRouteStore {
    private(set) var requestedTeamId: String?

    func request(teamId: String) {
        requestedTeamId = teamId
    }

    /// Returns the pending team id once, clearing it.
    func consume() -> String? {
        defer { requestedTeamId = nil }
        return requestedTeamId
    }
}
