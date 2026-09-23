import Foundation

// Chooses the initial team for the Depth Charts tab: favorite, last viewed, then default.
//
// Every candidate is validated against the live team ids when they are available so a
// A stale preference falls through to the default instead of causing navigation to fail.
enum StartupTeam {
    /// The initial team used when no saved preference is available.
    static let defaultTeamId = "seahawks"

    /// `validIds == nil` means "the team list hasn't loaded yet": resolve optimistically
    /// so the chart can start loading before the list round-trip finishes. Call again
    /// with the loaded ids to correct a stale preference (see `DepthChartsTab`).
    ///
    /// Resolves favorite → last viewed → default. A favorite is considered only when
    /// `startOnFavorite` is enabled and the saved value is non-empty.
    static func resolve(
        favoriteTeamId: String? = nil,
        startOnFavorite: Bool = false,
        lastTeamId: String? = nil,
        validIds: [String]? = nil,
        defaultId: String = defaultTeamId
    ) -> String {
        if startOnFavorite,
            let favorite = favoriteTeamId?.trimmingCharacters(in: .whitespacesAndNewlines),
            !favorite.isEmpty,
            validIds?.contains(favorite) != false
        {
            return favorite
        }
        guard
            let candidate = lastTeamId?.trimmingCharacters(in: .whitespacesAndNewlines),
            !candidate.isEmpty
        else { return defaultId }
        if let validIds, !validIds.contains(candidate) { return defaultId }
        return candidate
    }
}
