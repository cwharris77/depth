import Foundation
import Observation

// Feature-local state for the round-4 Stats page (spec: mirrors web's TeamStatsView —
// record, splits, PF/PA/diff, season chips, next-game card). All seasons arrive in the
// one `teamStats` payload, so season selection is pure state with no refetch (cheaper
// than web, which re-reads on every tab). The next-game card is derived from the
// deliberately-uncached `teamSchedule` read (recorded decision #5): a schedule failure
// hides the card, never the page — web's `page.tsx` wraps `getNextGame` the same way.
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
    private(set) var nextGame: ScheduleGame?

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

    /// DEP-245: true while a completed past season's chip is selected — the only state
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

    /// DEP-245: one-tap return to the current season, mirroring the roster's existing
    /// "Back to today" path (`selectImmediately(.current(...))`). Pure local state —
    /// no refetch, same as any other season selection here.
    func backToCurrentSeason() {
        guard let currentSeason else { return }
        selectedSeason = currentSeason
    }

    func load() async {
        loadState = .loading
        do {
            let page = try await repository.teamStats(teamId: teamId)
            self.page = page
            if selectedSeason == nil {
                selectedSeason = page.seasons.first?.season ?? page.upcomingSeason
            }
            loadState = .loaded
        } catch let error as DepthError {
            page = nil
            loadState = .failed(error)
        } catch {
            page = nil
            loadState = .failed(.server("\(error)"))
        }
        await loadNextGame()
    }

    /// Pure selection — every season is already in the `teamStats` payload.
    func selectSeason(_ season: Int) {
        selectedSeason = season
    }

    private func loadNextGame() async {
        // `try?` on purpose (recorded decision #5): a schedule read failure hides the
        // card but must not fail the page. Mirrors web's getNextGame — first non-bye
        // game with no result yet (and a resolved opponent, like the card's show gate).
        guard let schedule = try? await repository.teamSchedule(teamId: teamId, season: nil) else {
            nextGame = nil
            return
        }
        nextGame = schedule.games.first { !$0.isBye && $0.result == nil && $0.opponent != nil }
    }
}
