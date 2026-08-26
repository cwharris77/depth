import Foundation
import Observation

// Feature-local state for the native two-team compare (DEP-258) — the port of web's
// components/CompareView.tsx. Owns the two picked team ids, the active tab
// (By team / By position), the selected lens/position, and each side's bounded stats
// and roster reads. Per-position groups are derived with pure helpers in
// Domain/Compare.swift, so the view stays thin.
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

    /// The three horizontally-paged unit-metrics lenses. Forecast and Roster were removed
    /// (Aug 2026 feedback pass) — Forecast needed an upcoming two-sided market line, blank
    /// for most teams most of the season; Roster paired snap share with no injury data to
    /// make it actionable. What's left is season-stable: never gated on the current week.
    enum Lens: String, CaseIterable, Hashable, Identifiable {
        case offense
        case defense
        case specialTeams

        var id: Self { self }

        var accessibilityLabel: String {
            switch self {
            case .offense: "Offense"
            case .defense: "Defense"
            case .specialTeams: "Special Teams"
            }
        }
    }

    enum EvidenceLoadState: Equatable {
        case idle
        case loading
        case loaded
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
    private(set) var lens: Lens = .offense
    private(set) var position: Position = .qb

    // MARK: - DEP-311: room-picker state

    /// The unit lens currently selected in the position picker (Offense / Defense / Special
    /// Teams).
    private(set) var selectedUnit: Unit = .offense
    /// The id of the room whose exact-role panel is currently expanded, or nil when every
    /// room is collapsed (Aug 2026: rooms are now collapsible — tapping the expanded room
    /// again collapses it, per Cooper: "right now it stays expanded forever"). A
    /// single-position room (Quarterback) never has a panel to expand, so this never holds
    /// its id — see `selectRoom`.
    private(set) var expandedRoomID: String?

    /// The room that owns `position` — always non-nil once a room's positions cover every
    /// `COMPARE_POSITIONS` value, which they do (see `CompareMatchRooms`). Drives which grid
    /// tile reads as active; independent of `expandedRoomID`, which drives panel visibility.
    var activeRoom: CompareRoom? { CompareMatchRooms.room(of: position) }
    /// The expanded room's full model, for the view to render its exact-role panel.
    var expandedRoom: CompareRoom? {
        guard let expandedRoomID else { return nil }
        return CompareMatchRooms.rooms.first { $0.id == expandedRoomID }
    }
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
    private var resolvingTeamIds: Set<String> = []

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

    var evidenceLoadState: EvidenceLoadState {
        guard pickedCount > 0 else { return .idle }
        return resolvingTeamIds.isEmpty ? .loaded : .loading
    }

    var snapshotA: TeamSnapshot? {
        guard let teamA else { return nil }
        return snapshots[teamA.id]
    }

    var snapshotB: TeamSnapshot? {
        guard let teamB else { return nil }
        return snapshots[teamB.id]
    }

    /// The side A team's stats, or nil when not picked/invalid.
    var effectiveStatsA: TeamSeasonStats? {
        guard let teamA else { return nil }
        return effectiveStats(for: teamA.id)
    }

    var effectiveStatsB: TeamSeasonStats? {
        guard let teamB else { return nil }
        return effectiveStats(for: teamB.id)
    }

    /// `seasons.first` alone picks up a stub: nflverse writes a `team_stats` row for a
    /// season as soon as its schedule exists, all zeros, well before any game is played
    /// (see `lib/nflverse/records.ts`'s "a scheduled-but-unstarted season is a real 0-0").
    /// That stub sorts newest-first ahead of last season's real row, and it never carries
    /// `matchupMetrics` (a separate nflverse table with nothing to aggregate yet) — so
    /// during the exact window this page cares about (preseason/early season, before this
    /// year's advanced stats exist), Compare read a metrics-less stub while a perfectly
    /// good prior-season row sat one index behind it. `effectiveStats(for:)` prefers the
    /// newest season that actually has `matchupMetrics`, falling back to `seasons.first`
    /// only if none do — which also means it stops reaching for last season the moment
    /// this year's first games are played and nflverse ingests real data for it.
    private func effectiveStats(for teamId: String) -> TeamSeasonStats? {
        guard let seasons = statsPages[teamId]?.seasons else { return nil }
        return seasons.first { $0.matchupMetrics != nil } ?? seasons.first
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
        resolvingTeamIds.insert(teamId)
        defer { resolvingTeamIds.remove(teamId) }

        // Stats and roster are independently optional. Resolve them concurrently, then
        // retain every successful result so one absent feed never blanks the other.
        async let stats = try? repository.teamStats(teamId: teamId)
        async let snapshot = try? repository.teamSnapshot(teamId: teamId)
        let (page, snap) = await (stats, snapshot)

        if let page {
            statsPages[teamId] = page
        } else {
            statsPages.removeValue(forKey: teamId)
        }
        if let snap {
            snapshots[teamId] = snap
        } else {
            snapshots.removeValue(forKey: teamId)
        }
    }

    func beginPicking(_ slot: Slot) {
        pickingSlot = slot
    }

    func endPicking() {
        pickingSlot = nil
    }

    /// Clears one slot's team, per Cooper's Aug 25 feedback ("we should have a button
    /// labeled 'Clear selection'" — re-tapping a filled slot to swap teams wasn't obvious).
    /// Cached stats/roster reads for that team id are left in place — harmless, and avoids
    /// re-fetching if the same team is picked again into either slot.
    func clearTeam(_ slot: Slot) {
        if slot == .a {
            teamA = nil
        } else {
            teamB = nil
        }
    }

    func selectTab(_ tab: Tab) {
        self.tab = tab
    }

    func selectLens(_ lens: Lens) {
        self.lens = lens
    }

    /// Called when a role tile is tapped inside an already-expanded panel — the panel's own
    /// room stays expanded, only the exact role changes.
    func selectPosition(_ position: Position) {
        self.position = position
    }

    // MARK: - DEP-311: room picker

    /// Moves the unit lens. Aug 2026 (Cooper: "the table doesn't update, it stays on the last
    /// selected team unit... it should default to the first [room] on the new page") —
    /// superseded DEP-311 task 3's "preserve the previous position across units" decision,
    /// which left the depth table showing a stale position from the old unit with no room
    /// highlighted to explain it. Every unit switch now jumps to its first room's first
    /// position, same as tapping that room directly.
    func selectUnit(_ unit: Unit) {
        guard unit != selectedUnit else { return }
        selectedUnit = unit
        guard let firstRoom = CompareMatchRooms.rooms(in: unit).first else { return }
        position = firstRoom.positions[0]
        expandedRoomID = firstRoom.positions.count > 1 ? firstRoom.id : nil
    }

    /// Taps a room tile. A single-position room (Quarterback) has no panel to show — it just
    /// selects its one position directly (Cooper: "since there's only one position in the QB
    /// group, don't add the secondary positions container for that one"). A multi-position
    /// room toggles: tapping it while collapsed expands it and resets to its FIRST position
    /// (DEP-311 task 3's original behavior, still correct for a fresh open); tapping it again
    /// while already expanded collapses the panel without touching `position` — the depth
    /// table keeps showing the role that was last selected (Cooper: rooms should collapse on
    /// a second tap, "right now it stays expanded forever").
    func selectRoom(_ room: CompareRoom) {
        guard room.unit == selectedUnit else { return }
        guard room.positions.count > 1 else {
            position = room.positions[0]
            expandedRoomID = nil
            return
        }
        if expandedRoomID == room.id {
            expandedRoomID = nil
        } else {
            expandedRoomID = room.id
            position = room.positions[0]
        }
    }
}
