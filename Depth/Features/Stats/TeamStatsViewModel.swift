import Foundation
import Observation

// Feature-local state for the round-4 Stats page (spec: mirrors web's TeamStatsView —
// record, splits, PF/PA/diff, season chips, roster leaders). All seasons arrive in the
// one `teamStats` payload, so season selection is pure state with no refetch. Roster
// leaders are the one exception: `rosterLeaders(teamId:season:)` is a separate
// per-season read (like web's getRosterLeaders), so `load()` fans it out once per season
// up front and caches the results by season — switching tabs afterward is still pure
// state, no refetch.
@Observable
@MainActor
final class TeamStatsViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case failed(DepthError)
    }

    let teamId: String
    private(set) var loadState: LoadState = .loading
    private(set) var page: TeamStatsPage?
    /// Selected season year. The synthetic upcoming chip is the same value as
    /// `upcomingSeason`; when ingest already landed a real row for that year, selecting
    /// it means that row (web's `upcomingSeasonHasRealRow` collapses the two cases).
    private(set) var selectedSeason: Int?
    /// ROSTER LEADERS, keyed by season — fetched once per season in `page.seasons`
    /// (web parity: `getRosterLeaders` re-derives leaders per season tab rather than
    /// pinning to the roster's newest season) so switching tabs is pure state, no
    /// refetch, same as `selectedSeasonStats`.
    private(set) var leadersBySeason: [Int: RosterLeaders] = [:]
    /// Last season's schedule per season row, keyed by the season it is compared against,
    /// for the hero's "through N games" pace line. Fetched once per season like leaders.
    private(set) var priorSchedulesBySeason: [Int: TeamSchedule] = [:]
    /// The team's R2 stat file: defense-allowed ranks for the story and recent form. Kept
    /// from an earlier load when a refresh can't reach it; without it the story uses the
    /// page's own metrics and the recent-form row stays hidden.
    private(set) var statHistory: TeamStatHistory?
    /// The upcoming season's schedule, for the opener line before any game is played.
    private(set) var upcomingSchedule: TeamSchedule?
    /// True when a reload failed but an earlier page is still on screen. The page keeps
    /// rendering the cached stats under a retry row instead of an error screen.
    private(set) var refreshFailed = false

    private let repository: DepthRepository

    init(teamId: String, repository: DepthRepository) {
        self.teamId = teamId
        self.repository = repository
    }

    var seasons: [TeamSeasonStats] { page?.seasons ?? [] }

    var upcomingSeason: Int? { page?.upcomingSeason }

    /// A real `team_stats` row can land for the upcoming season ahead of kickoff — that
    /// row IS the upcoming season (no synthetic chip; it carries the UPCOMING badge).
    var upcomingSeasonHasRealRow: Bool {
        guard let upcoming = upcomingSeason else { return false }
        return seasons.contains { $0.season == upcoming }
    }

    /// Synthetic chip shown for all teams during the off-season, unless a real row for
    /// that year exists (web's `hasUpcomingChip = !!upcomingSeason && !upcomingSeasonHasRealRow`).
    var hasUpcomingChip: Bool {
        upcomingSeason != nil && !upcomingSeasonHasRealRow
    }

    var selectedSeasonStats: TeamSeasonStats? {
        guard let selectedSeason else { return nil }
        return seasons.first { $0.season == selectedSeason }
    }

    /// The overview's one story: this season's, or last season's while this one has
    /// fewer than two games to rank.
    var selectedStory: TeamStatsOverviewStory? {
        guard let page, let selectedSeason else { return nil }
        return TeamSeasonStoryBuilder.overviewStory(
            page: page, selectedSeason: selectedSeason, history: statHistory)
    }

    /// The defense over its last few games, when that window ranks top or bottom five.
    var selectedRecentForm: TeamRecentForm? {
        guard let selectedSeason, let season = statHistory?.season(selectedSeason) else {
            return nil
        }
        return TeamRecentFormBuilder.recentForm(season)
    }

    /// The upcoming season's first game, while that season has none played.
    var selectedSeasonOpener: TeamSeasonOpener? {
        guard let selectedSeason, selectedSeason == upcomingSeason,
            selectedSeasonStats.map({ TeamSeasonStoryBuilder.games($0) == 0 }) ?? true,
            upcomingSchedule?.season == selectedSeason
        else { return nil }
        return TeamSeasonOpener.first(in: upcomingSchedule)
    }

    var selectedSeasonPace: TeamSeasonPace? {
        guard let stats = selectedSeasonStats else { return nil }
        return TeamSeasonPace.compare(stats, priorSchedule: priorSchedulesBySeason[stats.season])
    }

    var selectedSeasonLeaders: RosterLeaders? {
        guard let selectedSeason else { return nil }
        return leadersBySeason[selectedSeason]
    }

    /// Mirrors web's `isViewingCurrentSeason`/`isViewingUpcomingSeason` (lines 277-281):
    /// the next-game card only renders on the current/upcoming tab, never a past season.
    /// With no upcoming season, "current" is the newest real season row.
    var isViewingCurrentOrUpcomingSeason: Bool {
        guard let page, let selectedSeason else { return false }
        if page.upcomingSeason != nil {
            return selectedSeason == page.upcomingSeason
        }
        return selectedSeason == page.seasons.first?.season
    }

    /// True while a completed past season's chip is selected — the only state
    /// that needs a "Back to current" escape (the current/upcoming tab needs none).
    /// Web parity quirk included: during the off-season the newest real season row is a
    /// past selection even when it is the initial tab, because "current" is the upcoming
    /// chip (`isViewingCurrentOrUpcomingSeason`).
    var isViewingPastSeason: Bool {
        guard selectedSeason != nil else { return false }
        return !isViewingCurrentOrUpcomingSeason
    }

    /// The season "Back to current" returns to: the upcoming season when one exists
    /// (real row or synthetic off-season chip), else the newest real season row.
    var currentSeason: Int? {
        page?.upcomingSeason ?? page?.seasons.first?.season
    }

    /// One-tap return to the current season, mirroring the roster's existing
    /// "Back to today" path (`selectImmediately(.current(...))`). Pure local state —
    /// no refetch, same as any other season selection here.
    func backToCurrentSeason() {
        guard let currentSeason else { return }
        selectedSeason = currentSeason
    }

    func load() async {
        if page == nil { loadState = .loading }
        // Read alongside the page, not after it, so the story renders once with the
        // defense metrics already in play instead of changing its headline a beat later.
        async let history = try? repository.teamStatHistory(teamId: teamId)
        do {
            let page = try await repository.teamStats(teamId: teamId)
            if let history = await history { statHistory = history }
            self.page = page
            refreshFailed = false
            if selectedSeason == nil {
                selectedSeason = page.seasons.first?.season ?? page.upcomingSeason
            }
            loadState = .loaded
        } catch {
            // A failed refresh over a page already on screen keeps that page: cached stats
            // under a retry row beat an error screen.
            if page != nil {
                refreshFailed = true
            } else {
                loadState = .failed(error as? DepthError ?? .server("\(error)"))
            }
        }
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadLeaders() }
            group.addTask { await self.loadPriorSchedules() }
            group.addTask { await self.loadUpcomingSchedule() }
        }
    }

    private func loadUpcomingSchedule() async {
        guard let upcoming = page?.upcomingSeason else { return }
        if let schedule = try? await repository.teamSchedule(teamId: teamId, season: upcoming) {
            upcomingSchedule = schedule
        }
    }

    /// Last season's schedule for each season row, for the pace line. `try?` per season:
    /// a missing schedule drops that season's pace line and nothing else.
    private func loadPriorSchedules() async {
        guard let page else { return }
        await withTaskGroup(of: (Int, TeamSchedule?).self) { group in
            for stats in page.seasons where TeamSeasonStoryBuilder.games(stats) > 0 {
                group.addTask { [repository, teamId] in
                    (
                        stats.season,
                        try? await repository.teamSchedule(
                            teamId: teamId, season: stats.season - 1)
                    )
                }
            }
            var result: [Int: TeamSchedule] = [:]
            for await (season, schedule) in group {
                if let schedule { result[season] = schedule }
            }
            priorSchedulesBySeason.merge(result) { _, new in new }
        }
    }

    /// One leaders fetch per season row (web parity comment in page.tsx: "seasons is
    /// small — current + up to two prior years, invariant 5") so the season switcher can
    /// show each season's own leaders. `try?` per season — one season's read failing
    /// must not blank the others.
    private func loadLeaders() async {
        guard let page else { return }
        await withTaskGroup(of: (Int, RosterLeaders?).self) { group in
            for stats in page.seasons {
                group.addTask { [repository, teamId] in
                    (
                        stats.season,
                        try? await repository.rosterLeaders(teamId: teamId, season: stats.season)
                    )
                }
            }
            var result: [Int: RosterLeaders] = [:]
            for await (season, leaders) in group {
                if let leaders { result[season] = leaders }
            }
            // Merge, never replace: a refresh that fails over a page still on screen must
            // not blank the seasons it already showed.
            leadersBySeason.merge(result) { _, new in new }
        }
    }

    /// Pure selection — every season is already in the `teamStats` payload.
    func selectSeason(_ season: Int) {
        selectedSeason = season
    }
}
