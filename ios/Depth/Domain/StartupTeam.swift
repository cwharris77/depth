import Foundation

// Which team the Depth Charts tab opens to on launch (2026-08-15 navigation-parity
// spec, locked decision #3: "Depth Charts launches into a chart, not a list").
// Mirrors the web's `resolveStartupTeam` (lib/utils/team/home-team.ts) including its
// favorite tier (DEP-319: native now has the `user_settings` write path the 2026-08-15
// spec deliberately deferred): favorite → last-viewed → default, with the favorite only
// honored when the user opted into open-at-startup (`startOnFavorite`).
//
// Every candidate is validated against the live team ids when they are available so a
// stale preference (team removed/renamed between releases) falls through to the default
// instead of erroring — AGENTS.md invariant 6, same defensive posture as the web helper.
enum StartupTeam {
    /// Must stay in sync with the web's `DEFAULT_TEAM_ID` (`lib/teams/index.ts`) so a
    /// first-time visitor opens the same team on both clients.
    static let defaultTeamId = "seahawks"

    /// `validIds == nil` means "the team list hasn't loaded yet": resolve optimistically
    /// so the chart can start loading before the list round-trip finishes. Call again
    /// with the loaded ids to correct a stale preference (see `DepthChartsTab`).
    ///
    /// Favorite → last-viewed → default (web's resolveStartupTeam precedence). The
    /// favorite is only consulted when `startOnFavorite` is true AND a favorite is set —
    /// matching web's `if (settings?.startOnFavorite && favorite && validIds.includes
    /// (favorite))`; `startOnFavorite == false` falls through to last-viewed like a user
    /// with no favorite.
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
