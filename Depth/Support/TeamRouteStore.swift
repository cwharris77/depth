import Foundation
import Observation

// A pending "show this team's depth chart" request, handed between tabs. The uniform
// archive's kit sheet can ask for a team the Depth Charts tab isn't currently on, and the
// two tabs have no view-tree relationship to pass it through — RootTabView switches the
// selected tab, this store carries which team (and optionally which uniform to select).
//
// Deliberately one nullable field and not a general router: the app has two cross-tab
// destinations (this and CompareRouteStore, DEP-405), each with its own store.
// `consume()` rather than a plain read so the request can't fire a second time when
// DepthChartsTab re-renders for an unrelated reason.
@MainActor
@Observable
final class TeamRouteStore {
    private(set) var requestedTeamId: String?
    private(set) var requestedUniformId: String?

    func request(teamId: String, uniformId: String? = nil) {
        requestedTeamId = teamId
        requestedUniformId = uniformId
    }

    /// Returns the pending team id and uniform id once, clearing both.
    func consume() -> (teamId: String?, uniformId: String?) {
        defer { requestedTeamId = nil; requestedUniformId = nil }
        return (requestedTeamId, requestedUniformId)
    }
}
