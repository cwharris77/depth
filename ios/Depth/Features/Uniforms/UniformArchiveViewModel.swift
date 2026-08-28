import Foundation
import Observation

// Feature-local state for the uniform archive tab. Loads the all-32-kits list through the
// repository seam once, then derives every surface the v2 archive design (Uniform Archive
// v2, 2026-08-27) shows — the team-card grid, the decade timeline, the per-team drill-in,
// and the summary/empty copy — from one filtered pass. The rules themselves are pure and
// live in UniformArchive (Domain/UniformListing.swift); this type only owns the mutable
// screen state (query, view mode, filters) and the load lifecycle.
//
// LoadState keeps loading/loaded/failed distinct so the view can offer the right recovery
// action — never a flash-then-jump (AGENTS.md #16).
@Observable
@MainActor
final class UniformArchiveViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case failed(DepthError)
    }

    /// The segmented control's two bodies. v2 replaced the single-decade era *filter*
    /// with this whole-view switch, so a decade is now something you browse rather than
    /// something you narrow to.
    enum ViewMode: String, Hashable {
        case team
        case era
    }

    private(set) var loadState: LoadState = .loading
    private(set) var listings: [UniformListing] = []

    var query = ""
    var viewMode: ViewMode = .team
    var filters = UniformArchive.Filters()

    private let repository: DepthRepository

    init(repository: DepthRepository) {
        self.repository = repository
    }

    func load() async {
        loadState = .loading
        do {
            listings = try await repository.listUniforms()
            loadState = .loaded
        } catch let error as DepthError {
            loadState = .failed(error)
        } catch {
            loadState = .failed(.server("\(error)"))
        }
    }

    // MARK: - Derived content

    /// Every kit surviving the filters *and* the query, with a team-level query match
    /// keeping all of that team's kits (searching "Seahawks" returns the team, not just
    /// its kits whose names contain "Seahawks").
    private var visibleKits: [UniformListing] {
        listings.filter { kit in
            guard UniformArchive.matchesFilters(kit, filters) else { return false }
            let teamMatches = UniformArchive.matchesTeam(kit, query: query)
            return UniformArchive.matchesQuery(kit, query: query, teamMatches: teamMatches)
        }
    }

    var groups: [UniformArchive.DivisionGroup] {
        UniformArchive.groupByDivision(visibleKits).map { group in
            var group = group
            group.teams = group.teams.map { team in
                var team = team
                team.kits = UniformArchive.sortKits(team.kits, by: filters.sort)
                return team
            }
            return group
        }
    }

    var decades: [UniformArchive.DecadeGroup] {
        UniformArchive.groupByDecade(visibleKits, sort: filters.sort)
    }

    /// One team's kits for the drill-in, re-derived from `groups` (not captured at tap
    /// time) so a filter or search change made while the drill-in is open is reflected
    /// there rather than leaving a stale snapshot on screen.
    func team(id: String) -> UniformArchive.TeamGroup? {
        groups.lazy.flatMap(\.teams).first { $0.teamId == id }
    }

    var shownKitCount: Int { visibleKits.count }

    var shownTeamCount: Int { Set(visibleKits.map(\.teamId)).count }

    var isEmpty: Bool { loadState == .loaded && visibleKits.isEmpty }

    /// Live counts for the Filters sheet's kind chips. Deliberately counted against the
    /// *unfiltered* archive: a chip that reported its own filtered count would read "0"
    /// the moment a different kind was selected, making the archive look empty.
    var kindCounts: [UniformKind: Int] {
        Dictionary(grouping: listings, by: \.kind).mapValues(\.count)
    }

    /// "105 kits · 32 teams · tap a team" while untouched, a plain count once narrowed —
    /// the hint only earns its space when there is nothing else to say, and it names
    /// whichever thing the current view mode actually makes tappable.
    var summary: String {
        let kits = "\(shownKitCount) \(shownKitCount == 1 ? "kit" : "kits")"
        let teams = "\(shownTeamCount) \(shownTeamCount == 1 ? "team" : "teams")"
        guard isPristine else { return "\(kits) · \(teams)" }
        return "\(kits) · \(teams) · tap a \(viewMode == .team ? "team" : "kit")"
    }

    /// The Filters sheet's primary button, which states what applying it leaves you with.
    var applyLabel: String {
        isPristine ? "Show all \(shownKitCount) kits" : "Show \(shownKitCount) kits"
    }

    var hasQuery: Bool { !query.isEmpty }

    /// No search text and no non-default filter — the archive as it first loads.
    private var isPristine: Bool { filters.isDefault && !hasQuery }

    // MARK: - Actions

    func resetFilters() {
        filters = UniformArchive.Filters()
    }

    /// The empty state's one button: search *and* filters, since either could be what
    /// emptied the screen and the user shouldn't have to work out which.
    func resetAll() {
        resetFilters()
        query = ""
    }
}
