import Foundation
import Observation

// Feature-local state for schedule loading and season selection. It never converts a
// failed read into a blank scorecard: loading, empty, and typed failure stay distinct so
// the view can offer the right recovery action.
@Observable
@MainActor
final class ScheduleViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case empty
        case failed(DepthError)
    }

    let teamId: String
    private(set) var loadState: LoadState = .loading
    private(set) var schedule: TeamSchedule?
    private(set) var selectedSeason: Int?
    private(set) var defaultSeason: Int?
    /// The PRESEASON/REGULAR/PLAYOFFS tab. Held here, not in the view, so it survives the
    /// view being rebuilt by a page switch.
    var phase: SchedulePhase = .regular

    private let repository: DepthRepository
    private var latestRequestID = 0

    init(teamId: String, repository: DepthRepository) {
        self.teamId = teamId
        self.repository = repository
    }

    var seasonOptions: [Int] {
        guard let defaultSeason, defaultSeason >= TeamSchedule.earliestSeason else { return [] }
        return Array(stride(from: defaultSeason, through: TeamSchedule.earliestSeason, by: -1))
    }

    var showsSeasonPicker: Bool {
        !seasonOptions.isEmpty
    }

    var isPastSeason: Bool {
        guard let defaultSeason, let selectedSeason else { return false }
        return selectedSeason < defaultSeason
    }

    /// The PLAYOFFS phase's state. A season counts as decided once it is in the past or
    /// its regular season is fully scored (a past season can carry an unscored, cancelled
    /// game — 2022 BUF-CIN — so the date check covers it). A run with a postseason game
    /// already on it always shows, whatever the regular-season rows say.
    var playoffsState: PlayoffsState? {
        guard let schedule else { return nil }
        let isDecided = isPastSeason || schedule.isRegularSeasonComplete
        if let run = schedule.postseason,
            isDecided || run.rounds.contains(where: { $0.game != nil })
        {
            return .run(run)
        }
        return isDecided ? .missed : .notStarted
    }

    /// `forceRefresh` is the pull-to-refresh path: it reads through the network instead of
    /// the cache window.
    func load(forceRefresh: Bool = false) async {
        await fetch(season: selectedSeason, forceRefresh: forceRefresh)
    }

    func selectSeason(_ season: Int) async {
        guard let defaultSeason, (TeamSchedule.earliestSeason...defaultSeason).contains(season)
        else {
            loadState = .failed(.validation("season"))
            return
        }
        selectedSeason = season
        await fetch(season: season)
    }

    private func fetch(season: Int?, forceRefresh: Bool = false) async {
        latestRequestID += 1
        let requestID = latestRequestID
        // Re-fetching the season already on screen (pull-to-refresh) keeps it visible until
        // the reload resolves, and keeps it if the reload fails; a different season clears
        // to the loading state.
        let keepsContent = loadState == .loaded && schedule?.season == season
        if !keepsContent {
            schedule = nil
            loadState = .loading
        }
        do {
            let result =
                forceRefresh
                ? try await repository.freshTeamSchedule(teamId: teamId, season: season)
                : try await repository.teamSchedule(teamId: teamId, season: season)
            guard requestID == latestRequestID else { return }
            if defaultSeason == nil {
                defaultSeason = result.season
            }
            selectedSeason = result.season
            schedule = result
            loadState = result.games.isEmpty ? .empty : .loaded
        } catch let error as DepthError {
            guard requestID == latestRequestID, !keepsContent else { return }
            schedule = nil
            loadState = error == .notFound ? .empty : .failed(error)
        } catch {
            guard requestID == latestRequestID, !keepsContent else { return }
            schedule = nil
            loadState = .failed(.server("\(error)"))
        }
    }
}
