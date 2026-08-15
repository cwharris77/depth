import Foundation

// Which team the Depth Charts tab opens to on launch (2026-08-15 navigation-parity
// spec, locked decision #3: "Depth Charts launches into a chart, not a list").
// Deliberately mirrors the web's `resolveStartupTeam` (lib/utils/team/home-team.ts)
// minus its favorite tier, which native does not have — native resolves last-viewed →
// default only, because a favorite tier needs a Supabase `user_settings` write path
// that is out of scope for an IA change (locked decision #8).
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
    static func resolve(
        lastTeamId: String?,
        validIds: [String]? = nil,
        defaultId: String = defaultTeamId
    ) -> String {
        guard
            let candidate = lastTeamId?.trimmingCharacters(in: .whitespacesAndNewlines),
            !candidate.isEmpty
        else { return defaultId }
        if let validIds, !validIds.contains(candidate) { return defaultId }
        return candidate
    }
}
