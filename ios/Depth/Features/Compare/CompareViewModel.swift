import Foundation
import Observation

// Feature-local state for the native two-team compare (DEP-258) — the port of web's
// components/CompareView.tsx. Owns the two picked team ids, the active tab
// (By team / By position), the selected position, and the per-side TeamStatsPage +
// TeamSnapshot resolution. Both sides' stats + snapshots resolve on pick (web resolves
// both unconditionally once a/b are picked, so the client-side tab switch needs both
// datasets on hand); the per-position groups and deepest-room teaser are derived with
// the pure helpers in Domain/Compare.swift, so the view stays thin.
//
// A side-resolution failure degrades that side to empty stats/roster (renders dashes /
// "Neither team lists a position") rather than failing the whole page — web's stats are
// optional (`record(undefined)` → em dashes) and an unpicked/unknown side simply shows
// no players. Only the initial team-list read can fail the page, which has a Retry.
@Observable
@MainActor
final class CompareViewModel {
    /// Web's `Tab` — which section is active. Native has no URL, so this is plain state
    /// defaulting to the matchup tab (web's no-`pos` default).
    enum Tab: Hashable {
        case matchup
        case position
    }

    enum LoadState: Equatable {
        case loading
        case loaded
        case failed(DepthError)
    }

    /// Which team-slot a picker sheet is targeting.
    enum Slot: Hashable {
        case a
        case b
    }

    private(set) var loadState: LoadState = .loading
    private(set) var teamA: Team?
    private(set) var teamB: Team?
    private(set) var statsA: TeamSeasonStats?
    private(set) var statsB: TeamSeasonStats?
    private(set) var tab: Tab = .matchup
    private(set) var position: Position = .qb
    /// A team-picker sheet is targeting this slot, or nil when closed.
    private(set) var pickingSlot: Slot?

    private let repository: DepthRepository
    /// DEP-280: the two team ids to auto-populate both slots with once teams load —
    /// set when Compare is pushed from a schedule-card tap (web's `?a=&b=` query
    /// params auto-populating both slots on navigation). nil for the tab-root
    /// instance, which opens with both slots empty as before.
    private let preselectedTeamIds: (a: String, b: String)?
    private var allTeams: [Team] = []
    private var statsPages: [String: TeamStatsPage] = [:]
    private var snapshots: [String: TeamSnapshot] = [:]

    init(repository: DepthRepository, preselectedTeamIds: (a: String, b: String)? = nil) {
        self.repository = repository
        self.preselectedTeamIds = preselectedTeamIds
    }

    var teams: [Team] { allTeams }

    var pickedCount: Int {
        [teamA, teamB].compactMap { $0 }.count
    }

    var bothPicked: Bool {
        teamA != nil && teamB != nil
    }

    var sameTeam: Bool {
        guard let teamA, let teamB else { return false }
        return teamA.id == teamB.id
    }

    /// The side A team's stats, or nil when not picked/invalid.
    var effectiveStatsA: TeamSeasonStats? {
        guard let teamA else { return nil }
        return statsPages[teamA.id]?.seasons.first
    }

    var effectiveStatsB: TeamSeasonStats? {
        guard let teamB else { return nil }
        return statsPages[teamB.id]?.seasons.first
    }

    /// The currently-selected position's two sides, depth-ordered (web's `positionsA`/
    /// `positionsB`). Empty when the relevant side isn't picked.
    var positionGroupA: [Player] {
        guard let roster = roster(of: teamA?.id) else { return [] }
        return getPlayers(in: roster, at: position)
    }

    var positionGroupB: [Player] {
        guard let roster = roster(of: teamB?.id) else { return [] }
        return getPlayers(in: roster, at: position)
    }

    /// The deepest-room teaser for the matchup tab (web `buildCompareTeaser`). Hidden
    /// unless both sides are picked and different — web hides it when `both` is false
    /// (and empty both sides → the function itself returns nil).
    var teaser: CompareTeaser? {
        guard bothPicked, !sameTeam else { return nil }
        return buildCompareTeaser(
            playersA: positionGroups(teamId: teamA?.id).map(\.players),
            playersB: positionGroups(teamId: teamB?.id).map(\.players),
            positions: COMPARE_POSITIONS
        )
    }

    /// All positions' arrays for one side, parallel to COMPARE_POSITIONS (web's
    /// `groupsA`/`groupsB`). Empty for an unpicked/undeleted side.
    private func positionGroups(teamId: String?) -> [(position: Position, players: [Player])] {
        guard let roster = roster(of: teamId) else { return [] }
        return COMPARE_POSITIONS.map { position in
            (position: position, players: getPlayers(in: roster, at: position))
        }
    }

    private func roster(of teamId: String?) -> Roster? {
        guard let teamId, let snapshot = snapshots[teamId] else { return nil }
        return Roster(players: snapshot.players, specialTeams: snapshot.specialTeams)
    }

    func load() async {
        loadState = .loading
        do {
            allTeams = try await repository.teams()
            loadState = .loaded
            // DEP-280: apply the schedule-card preselection once teams are known —
            // mirrors web's compare page resolving both a/b query params unconditionally
            // on load. Re-running on `.refreshable` just re-picks the same two teams
            // (pickTeam is idempotent per side), so no extra guard is needed.
            if let preselectedTeamIds {
                await pickTeam(preselectedTeamIds.a, into: .a)
                await pickTeam(preselectedTeamIds.b, into: .b)
            }
        } catch let error as DepthError {
            loadState = .failed(error)
        } catch {
            loadState = .failed(.server("\(error)"))
        }
    }

    /// Picks a team into a slot and resolves that side. Mirrors web's `updateUrl` —
    /// replacing both teams on re-pick. A team the list doesn't know degrades to
    /// unpicked (web: unknown id → undefined → treated as unpicked).
    func pickTeam(_ teamId: String, into slot: Slot) async {
        guard let team = allTeams.first(where: { $0.id == teamId }) else { return }
        if slot == .a {
            teamA = team
        } else {
            teamB = team
        }
        await resolveSide(team.id)
    }

    /// Resolves one side's stats + snapshot once its team is known. A read failure
    /// degrades that side (dashes / no players) rather than failing the page.
    private func resolveSide(_ teamId: String) async {
        async let stats = repository.teamStats(teamId: teamId)
        async let snapshot = repository.teamSnapshot(teamId: teamId)
        do {
            let (page, snap) = try await (stats, snapshot)
            statsPages[teamId] = page
            snapshots[teamId] = snap
        } catch {
            // Degrade: drop any prior value so the side shows unpicked-state dashes.
            statsPages.removeValue(forKey: teamId)
            snapshots.removeValue(forKey: teamId)
        }
    }

    func beginPicking(_ slot: Slot) {
        pickingSlot = slot
    }

    func endPicking() {
        pickingSlot = nil
    }

    func selectTab(_ tab: Tab) {
        self.tab = tab
    }

    func selectPosition(_ position: Position) {
        self.position = position
    }
}