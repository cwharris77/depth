import Foundation

// Literal port of lib/utils/depth-chart/overrides-sync.ts's `planMerge` (DEP-219). Pure
// reconciliation of the local override cache against the server's on sign-in: a team
// edited only locally (server has never seen it) is pushed up; any team the server
// already holds wins and is pulled down over the local copy — it's the durable
// cross-device truth. Local-empty or server-empty teams produce no work. Deterministic,
// no prompts — same policy web already locked, not a new decision.
struct DepthOverrideMergePlan: Equatable {
    /// teamIds whose local override should be uploaded (server has none yet).
    let pushes: [String]
    /// teamId -> server override to write locally (server wins).
    let pulls: [String: [Position: [String]]]
}

enum DepthOverrideMerge {
    static func plan(
        local: [String: [Position: [String]]],
        server: [String: [Position: [String]]]
    ) -> DepthOverrideMergePlan {
        let pushes = local.keys
            .filter { teamId in hasKeys(local[teamId]) && !hasKeys(server[teamId]) }
            .sorted()
        let pulls = server.filter { hasKeys($0.value) }
        return DepthOverrideMergePlan(pushes: pushes, pulls: pulls)
    }

    private static func hasKeys(_ override: [Position: [String]]?) -> Bool {
        !(override?.isEmpty ?? true)
    }
}
